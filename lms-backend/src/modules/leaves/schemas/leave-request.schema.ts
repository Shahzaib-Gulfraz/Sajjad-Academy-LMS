import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/auth/roles.enum';

@Schema({ timestamps: true, collection: 'leave_requests' })
export class LeaveRequest {
  @Prop({ required: true, trim: true })
  requesterUserId!: string;

  @Prop({ required: true, type: String, enum: UserRole })
  requesterRole!: UserRole;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ required: true, trim: true })
  fromDate!: string;

  @Prop({ required: true, trim: true })
  toDate!: string;

  @Prop({ required: true, trim: true })
  reason!: string;

  @Prop({ required: true, trim: true, default: 'Pending' })
  status!: 'Pending' | 'Approved' | 'Rejected';

  @Prop({ trim: true })
  reviewedBy?: string;
}

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;
export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

LeaveRequestSchema.index({ requesterUserId: 1, createdAt: -1 });
LeaveRequestSchema.index({ status: 1, requesterRole: 1 });
