import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'notification_reads' })
export class NotificationRead {
  @Prop({ required: true, trim: true })
  userId!: string;

  @Prop({ required: true, trim: true })
  notificationId!: string;

  @Prop({ required: true, trim: true })
  readAt!: string;
}

export type NotificationReadDocument = HydratedDocument<NotificationRead>;
export const NotificationReadSchema =
  SchemaFactory.createForClass(NotificationRead);

NotificationReadSchema.index(
  { userId: 1, notificationId: 1 },
  { unique: true },
);
NotificationReadSchema.index({ userId: 1, createdAt: -1 });
