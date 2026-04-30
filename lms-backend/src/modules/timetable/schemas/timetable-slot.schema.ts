import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'timetable_slots' })
export class TimetableSlot {
  @Prop({ required: false, trim: true })
  startDate?: string; // YYYY-MM-DD

  @Prop({ required: false, trim: true })
  endDate?: string; // YYYY-MM-DD

  @Prop({ required: true, trim: true })
  date!: string; // YYYY-MM-DD

  @Prop({ required: true, trim: true })
  startTime!: string; // HH:mm

  @Prop({ required: true, trim: true })
  endTime!: string; // HH:mm

  @Prop({ type: Types.ObjectId, ref: 'SchoolClass', required: true })
  className!: Types.ObjectId; // Class ID

  @Prop({ required: true, trim: true })
  subject!: string; // Subject UUID

  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true })
  teacherId!: Types.ObjectId;
}

export type TimetableSlotDocument = HydratedDocument<TimetableSlot>;
export const TimetableSlotSchema = SchemaFactory.createForClass(TimetableSlot);

TimetableSlotSchema.index({ startDate: 1, endDate: 1, className: 1, startTime: 1, endTime: 1 });
TimetableSlotSchema.index({ date: 1, className: 1, startTime: 1, endTime: 1 });
TimetableSlotSchema.index({ date: 1, teacherId: 1, startTime: 1, endTime: 1 });
