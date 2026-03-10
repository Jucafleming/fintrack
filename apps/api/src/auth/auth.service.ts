import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { Group } from '../groups/group.entity';
import { GroupMember } from '../groups/group-member.entity';
import { GroupRole } from '@fintrack/shared';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SeedService } from '../seed/seed.service';



@Injectable()
export class AuthService {
constructor(
  @InjectRepository(User)
  private usersRepo: Repository<User>,
  private jwtService: JwtService,
  private config: ConfigService,
  private dataSource: DataSource,
  private seedService: SeedService,
) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        name: dto.name,
        email: dto.email,
        passwordHash,
      });
      await manager.save(user);

      // RF-006: ao criar conta, cria grupo automaticamente
      const group = manager.create(Group, { name: `${dto.name}'s Group` });
      await manager.save(group);

      const member = manager.create(GroupMember, {
        userId: user.id,
        groupId: group.id,
        role: GroupRole.ADMIN,
      });
      await manager.save(member);

      await this.seedService.seedGroup(group.id, manager);

      const tokens = await this.generateTokens(user);
      await manager.update(User, user.id, {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      });

      return { user: this.sanitize(user), ...tokens };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);
    await this.usersRepo.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    const valid = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException('Refresh token invalid or expired');

    const tokens = await this.generateTokens(user);
    await this.usersRepo.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return tokens;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepo.findOne({ where: { email } });
    // Não revela se o e-mail existe ou não (segurança)
    if (!user) return { message: 'If this email exists, a reset link was sent' };

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await this.usersRepo.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });

    // TODO Sprint 4: integrar envio de e-mail (nodemailer/resend)
    console.log(`[DEV] Reset token for ${email}: ${token}`);

    return { message: 'If this email exists, a reset link was sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .where('user.resetPasswordToken = :token', { token })
      .andWhere('user.resetPasswordExpires > :now', { now: new Date() })
      .getOne();

    if (!user) throw new BadRequestException('Token invalid or expired');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: 'Password updated successfully' };
  }

private async generateTokens(user: User) {
  const payload = { sub: user.id, email: user.email };

  const secret = this.config.get<string>('JWT_SECRET')!;
  const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;
  const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN')!;
  const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN')!;

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(payload, { secret, expiresIn: accessExpiresIn as any }),
    this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn as any }),
  ]);

  return { accessToken, refreshToken };
}

  private sanitize(user: User) {
    const { passwordHash, refreshToken, resetPasswordToken, resetPasswordExpires, ...safe } = user;
    return safe;
  }
}
