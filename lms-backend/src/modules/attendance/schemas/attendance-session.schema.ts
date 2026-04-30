import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

@Schema({ _id: false })
export class AttendanceEntry {
  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({
    required: true,
    enum: ['Present', 'Absent', 'Late', 'Leave'],
    default: 'Present',
  })
  status!: AttendanceStatus;
}

const AttendanceEntrySchema = SchemaFactory.createForClass(AttendanceEntry);

@Schema({ timestamps: true, collection: 'attendance_sessions' })
export class AttendanceSession {
  @Prop({ required: true, trim: true })
  className!: string;

  @Prop({ required: true, trim: true })
  teacherId!: string;

  @Prop({ required: true, trim: true })
  teacherName!: string;

  @Prop({ required: true, trim: true })
  date!: string;

  @Prop({ required: true, trim: true })
  time!: string;

  @Prop({ required: true, trim: true, default: 'Regular' })
  classType!: string;

  @Prop({ trim: true })
  roomOrMode?: string;

  @Prop({ type: [AttendanceEntrySchema], default: [] })
  entries!: AttendanceEntry[];
}

export type AttendanceSessionDocument = HydratedDocument<AttendanceSession>;
export const AttendanceSessionSchema =
  SchemaFactory.createForClass(AttendanceSession);

AttendanceSessionSchema.index({ className: 1, date: -1 });
AttendanceSessionSchema.index({ teacherId: 1, date: -1 });
AttendanceSessionSchema.index({ 'entries.studentId': 1, date: -1 });
