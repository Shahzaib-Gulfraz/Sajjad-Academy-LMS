import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { FeesService } from './fees.service';
import { CreateFeeTransactionDto } from './dto/create-fee-transaction.dto';
import { UpdateFeeTransactionDto } from './dto/update-fee-transaction.dto';
import { UpsertFeeInvoiceDto } from './dto/upsert-fee-invoice.dto';
import {
  FeeDuesReportResponseDto,
  FeeInvoiceResponseDto,
  FeeStudentSummaryResponseDto,
  FeeTransactionResponseDto,
  FeeTransactionsListResponseDto,
} from './dto/fees-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('fees')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get('students/:studentId/summary')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get fee summary for a student' })
  @ApiOkResponse({ type: FeeStudentSummaryResponseDto })
  async getStudentSummary(@Param('studentId') studentId: string) {
    return {
      data: await this.feesService.getStudentSummary(studentId),
    };
  }

  @Post('transactions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create fee transaction' })
  @ApiBody({ type: CreateFeeTransactionDto })
  @ApiOkResponse({ type: FeeTransactionResponseDto })
  async createTransaction(@Body() dto: CreateFeeTransactionDto) {
    return {
      data: await this.feesService.createTransaction(dto),
    };
  }

  @Patch('transactions/:transactionId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update fee transaction' })
  @ApiBody({ type: UpdateFeeTransactionDto })
  @ApiOkResponse({ type: FeeTransactionResponseDto })
  async updateTransaction(
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateFeeTransactionDto,
  ) {
    return {
      data: await this.feesService.updateTransaction(transactionId, dto),
    };
  }

  @Post('invoices/upsert')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or update student fee invoice' })
  @ApiBody({ type: UpsertFeeInvoiceDto })
  @ApiOkResponse({ type: FeeInvoiceResponseDto })
  async upsertInvoice(@Body() dto: UpsertFeeInvoiceDto) {
    return {
      data: await this.feesService.upsertInvoice(dto),
    };
  }

  @Get('transactions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List fee transactions' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiOkResponse({ type: FeeTransactionsListResponseDto })
  async listTransactions(@Query('studentId') studentId?: string) {
    return {
      data: await this.feesService.listTransactions({ studentId }),
    };
  }

  @Get('reports/dues')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dues report by student' })
  @ApiOkResponse({ type: FeeDuesReportResponseDto })
  async duesReport() {
    return {
      data: await this.feesService.duesReport(),
    };
  }
}
