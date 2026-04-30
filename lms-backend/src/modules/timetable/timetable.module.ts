import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TimetableSlot,
  TimetableSlotSchema,
} from './schemas/timetable-slot.schema';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import {
  SchoolClass,
  SchoolClassSchema,
} from '../classes/schemas/class.schema';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TimetableSlot.name,
        schema: TimetableSlotSchema,
      },
      {
        name: Teacher.name,
        schema: TeacherSchema,
      },
      {
        name: SchoolClass.name,
        schema: SchoolClassSchema,
      },
    ]),
    StudentsModule,
  ],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
