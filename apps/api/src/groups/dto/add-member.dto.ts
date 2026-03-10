import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { GroupRole } from '@fintrack/shared';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;
}
