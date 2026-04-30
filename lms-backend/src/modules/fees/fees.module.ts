import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeeInvoice, FeeInvoiceSchema } from './schemas/fee-invoice.schema';
import {
  FeeTransaction,
  FeeTransactionSchema,
} from './schemas/fee-transaction.schema';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: FeeTransaction.name, schema: FeeTransactionSchema },
    ]),
  ],
  providers: [FeesService],
  controllers: [FeesController],
  exports: [FeesService],
})
export class FeesModule {}
