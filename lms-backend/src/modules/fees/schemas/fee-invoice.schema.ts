import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'fee_invoices' })
export class FeeInvoice {
  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({ required: true, trim: true })
  period!: string;

  @Prop({ required: true, min: 0 })
  amountDue!: number;

  @Prop({ required: true, trim: true, default: 'Pending' })
  status!: string;
}

export type FeeInvoiceDocument = HydratedDocument<FeeInvoice>;
export const FeeInvoiceSchema = SchemaFactory.createForClass(FeeInvoice);

FeeInvoiceSchema.index({ studentId: 1, period: -1 });
FeeInvoiceSchema.index({ studentId: 1, period: 1 }, { unique: true });
