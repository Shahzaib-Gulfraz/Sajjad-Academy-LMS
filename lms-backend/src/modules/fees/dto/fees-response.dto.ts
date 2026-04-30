import { ApiProperty } from '@nestjs/swagger';

class FeeTransactionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty({ required: false })
  invoiceId?: string;

  @ApiProperty()
  receiptNo!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  collector!: string;

  @ApiProperty({ required: false })
  remarks?: string;

  @ApiProperty()
  paidAt!: string;
}

class FeeStudentSummaryDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  totalDue!: number;

  @ApiProperty()
  totalPaid!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty({ enum: ['Paid', 'Partial', 'Pending'] })
  status!: 'Paid' | 'Partial' | 'Pending';
}

class DuesReportItemDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  totalDue!: number;

  @ApiProperty()
  totalPaid!: number;

  @ApiProperty()
  pending!: number;
}

class FeeInvoiceItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  amountDue!: number;

  @ApiProperty({ enum: ['Paid', 'Partial', 'Pending'] })
  status!: 'Paid' | 'Partial' | 'Pending';
}

export class FeeTransactionResponseDto {
  @ApiProperty({ type: FeeTransactionItemDto })
  data!: FeeTransactionItemDto;
}

export class FeeTransactionsListResponseDto {
  @ApiProperty({ type: [FeeTransactionItemDto] })
  data!: FeeTransactionItemDto[];
}

export class FeeStudentSummaryResponseDto {
  @ApiProperty({ type: FeeStudentSummaryDto })
  data!: FeeStudentSummaryDto;
}

export class FeeDuesReportResponseDto {
  @ApiProperty({ type: [DuesReportItemDto] })
  data!: DuesReportItemDto[];
}

export class FeeInvoiceResponseDto {
  @ApiProperty({ type: FeeInvoiceItemDto })
  data!: FeeInvoiceItemDto;
}
