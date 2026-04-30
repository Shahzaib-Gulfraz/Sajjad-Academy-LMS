import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFeeTransactionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000000)
  amount?: number;

  @IsOptional()
  @IsEnum(['Cash', 'Card', 'Bank Transfer', 'Online'])
  method?: 'Cash' | 'Card' | 'Bank Transfer' | 'Online';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  collector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  remarks?: string;
}
