import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/auth/roles.enum';

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ required: true, trim: true, default: 'medium' })
  priority!: 'low' | 'medium' | 'high';

  @Prop({ required: true, trim: true, default: 'all' })
  targetType!: 'all' | 'classes' | 'students';

  @Prop({ type: [String], default: [] })
  targetClasses!: string[];

  @Prop({ type: [String], default: [] })
  targetStudentIds!: string[];

  @Prop({ required: true, trim: true })
  authorId!: string;

  @Prop({ required: true, type: String, enum: UserRole })
  authorRole!: UserRole;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop({ required: true, trim: true })
  publishedAt!: string;
}

export type AnnouncementDocument = HydratedDocument<Announcement>;
export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);

AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ targetType: 1, createdAt: -1 });
AnnouncementSchema.index({ targetClasses: 1, createdAt: -1 });
AnnouncementSchema.index({ targetStudentIds: 1, createdAt: -1 });
