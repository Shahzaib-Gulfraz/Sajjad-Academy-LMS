import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/auth/roles.enum';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ unique: true, sparse: true, trim: true })
  systemId?: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  refreshTokenHash?: string;

  @Prop()
  lastLoginAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ systemId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
