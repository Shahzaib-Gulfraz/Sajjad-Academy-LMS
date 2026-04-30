import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'fee_transactions' })
export class FeeTransaction {
  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({ trim: true })
  invoiceId?: string;

  @Prop({ required: true, trim: true, unique: true })
  receiptNo!: string;

  @Prop({ required: true, min: 1 })
  amount!: number;

  @Prop({ required: true, trim: true })
  method!: string;

  @Prop({ required: true, trim: true })
  collector!: string;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ required: true, trim: true })
  paidAt!: string;
}

export type FeeTransactionDocument = HydratedDocument<FeeTransaction>;
export const FeeTransactionSchema =
  SchemaFactory.createForClass(FeeTransaction);

FeeTransactionSchema.index({ receiptNo: 1 }, { unique: true });
FeeTransactionSchema.index({ studentId: 1, paidAt: -1 });
