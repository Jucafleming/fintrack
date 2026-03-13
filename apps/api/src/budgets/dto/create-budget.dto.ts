import { IsUUID, IsInt, Min, Max, IsNumber, IsPositive } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID()
  categoryId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  limitAmount: number;
}
