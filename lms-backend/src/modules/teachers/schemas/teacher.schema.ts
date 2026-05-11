import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'teachers' })
export class Teacher {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  employeeNo!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ trim: true, default: '' })
  gender!: string;

  @Prop({ trim: true, default: '' })
  qualification!: string;

  @Prop({ trim: true, default: '' })
  phone!: string;

  @Prop({ trim: true, default: '' })
  address!: string;

  @Prop({ trim: true, default: '' })
  dob!: string;

  @Prop({ trim: true, default: '' })
  emergencyContact!: string;

  @Prop({ trim: true, default: '' })
  emergencyPhone!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SchoolClass' }], default: [] })
  classes!: Types.ObjectId[];

  @Prop({ type: Map, of: [String], default: {} })
  classSubjects!: Record<string, string[]>;

  @Prop({ trim: true, default: '' })
  avatarUrl!: string;

  @Prop({ default: 'Active' })
  status!: string;
}

export type TeacherDocument = HydratedDocument<Teacher>;
export const TeacherSchema = SchemaFactory.createForClass(Teacher);

TeacherSchema.index({ employeeNo: 1 }, { unique: true });
TeacherSchema.index({ email: 1 });
