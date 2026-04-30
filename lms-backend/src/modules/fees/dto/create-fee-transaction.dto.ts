import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeeTransactionDto {
  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsInt()
  @Min(1)
  @Max(10000000)
  amount!: number;

  @IsEnum(['Cash', 'Card', 'Bank Transfer', 'Online'])
  method!: 'Cash' | 'Card' | 'Bank Transfer' | 'Online';

  @IsString()
  @MaxLength(100)
  collector!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  remarks?: string;
}
