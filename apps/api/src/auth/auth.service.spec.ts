import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { SeedService } from '../seed/seed.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockUser: Partial<User> = {
  id: 'uuid-123',
  name: 'João Fleming',
  email: 'joao@fintrack.com',
  passwordHash: 'hashed_password',
  refreshToken: 'hashed_refresh',
  resetPasswordToken: null,
  resetPasswordExpires: null,
};

const mockUsersRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test_secret',
      JWT_REFRESH_SECRET: 'test_refresh_secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SeedService, useValue: { seedGroup: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({ name: 'João', email: 'joao@fintrack.com', password: 'Senha123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user, group and return tokens on success', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockJwtService.signAsync.mockResolvedValue('mock_token');

      mockDataSource.transaction.mockImplementation(async (cb: (manager: any) => any) => {
        const manager = {
          create: jest.fn((_: any, data: any) => ({ ...data, id: 'uuid-new' })),
          save: jest.fn((entity: any) => Promise.resolve(entity)),
          update: jest.fn(),
        };
        return cb(manager);
      });

      const result = await service.register({
        name: 'João Fleming',
        email: 'novo@fintrack.com',
        password: 'Senha123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshToken');
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@test.com', password: 'Senha123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'joao@fintrack.com', password: 'SenhaErrada1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid credentials', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh');
      mockJwtService.signAsync.mockResolvedValue('mock_token');
      mockUsersRepo.update.mockResolvedValue(undefined);

      const result = await service.login({ email: 'joao@fintrack.com', password: 'Senha123' });

      expect(result).toHaveProperty('accessToken', 'mock_token');
      expect(result).toHaveProperty('refreshToken', 'mock_token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('uuid-123', 'raw_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('uuid-123', 'wrong_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on valid refresh token', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh');
      mockJwtService.signAsync.mockResolvedValue('new_mock_token');
      mockUsersRepo.update.mockResolvedValue(undefined);

      const result = await service.refresh('uuid-123', 'valid_refresh_token');

      expect(result).toHaveProperty('accessToken', 'new_mock_token');
      expect(result).toHaveProperty('refreshToken', 'new_mock_token');
    });
  });

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('should return generic message even if email does not exist', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('naoexiste@test.com');

      expect(result.message).toBe('If this email exists, a reset link was sent');
      expect(mockUsersRepo.update).not.toHaveBeenCalled();
    });

    it('should save reset token if email exists', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      mockUsersRepo.update.mockResolvedValue(undefined);

      const result = await service.forgotPassword('joao@fintrack.com');

      expect(mockUsersRepo.update).toHaveBeenCalled();
      expect(result.message).toBe('If this email exists, a reset link was sent');
    });
  });

  // ─── Reset Password ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockUsersRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(service.resetPassword('invalid_token', 'NovaSenha123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update password and clear token on valid reset', async () => {
      mockUsersRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockUsersRepo.update.mockResolvedValue(undefined);

      const result = await service.resetPassword('valid_token', 'NovaSenha123');

      expect(mockUsersRepo.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ resetPasswordToken: null, resetPasswordExpires: null }),
      );
      expect(result.message).toBe('Password updated successfully');
    });
  });
});
