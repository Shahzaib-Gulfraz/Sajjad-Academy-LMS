import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { randomUUID } from 'crypto';

@Schema({ _id: false })
export class ClassSubject {
  @Prop({ default: () => randomUUID() })
  id!: string;

  @Prop({ required: true, trim: true })
  name!: string;
}
const ClassSubjectSchema = SchemaFactory.createForClass(ClassSubject);

@Schema({ timestamps: true, collection: 'classes' })
export class SchoolClass {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  academicYear!: string;

  @Prop({ type: [ClassSubjectSchema], default: [] })
  subjects!: ClassSubject[];
}

export type SchoolClassDocument = HydratedDocument<SchoolClass>;
export const SchoolClassSchema = SchemaFactory.createForClass(SchoolClass);

SchoolClassSchema.index(
  { name: 1, academicYear: 1 },
  { unique: true },
);
