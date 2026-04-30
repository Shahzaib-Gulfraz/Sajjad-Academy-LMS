import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/auth/roles.enum';

export type PasswordResetRequestStatus = 'PENDING' | 'RESOLVED';

@Schema({ timestamps: true, collection: 'password_reset_requests' })
export class PasswordResetRequest {
  @Prop({ required: true, trim: true })
  identifier!: string;

  @Prop({
    required: true,
    trim: true,
    enum: [UserRole.TEACHER, UserRole.STUDENT],
  })
  role!: UserRole.TEACHER | UserRole.STUDENT;

  @Prop({ required: true, trim: true })
  targetName!: string;

  @Prop({ required: true, trim: true })
  targetUserId!: string;

  @Prop({ required: true, trim: true })
  targetRecordId!: string;

  @Prop({
    required: true,
    trim: true,
    enum: ['PENDING', 'RESOLVED'],
    default: 'PENDING',
  })
  status!: PasswordResetRequestStatus;

  @Prop({ required: true, trim: true })
  requestedAt!: string;

  @Prop({ trim: true })
  resolvedAt?: string;

  @Prop({ trim: true })
  resolvedBy?: string;
}

export type PasswordResetRequestDocument =
  HydratedDocument<PasswordResetRequest>;
export const PasswordResetRequestSchema =
  SchemaFactory.createForClass(PasswordResetRequest);

PasswordResetRequestSchema.index({ status: 1, requestedAt: -1 });
PasswordResetRequestSchema.index({ identifier: 1, status: 1 });
