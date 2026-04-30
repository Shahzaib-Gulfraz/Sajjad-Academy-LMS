import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class UpsertFeeInvoiceDto {
  @IsString()
  studentId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  period!: string;

  @IsInt()
  @Min(0)
  @Max(10000000)
  amountDue!: number;
}
