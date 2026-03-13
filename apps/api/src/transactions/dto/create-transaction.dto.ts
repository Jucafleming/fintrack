import {
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { TransactionType, Ownership } from '@fintrack/shared';

export class CreateTransactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsEnum(Ownership)
  ownership?: Ownership;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  installmentCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
