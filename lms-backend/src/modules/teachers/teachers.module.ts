import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { UsersModule } from '../users/users.module';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import {
  Assignment,
  AssignmentSchema,
} from '../assignments/schemas/assignment.schema';
import { Quiz, QuizSchema } from '../quizzes/schemas/quiz.schema';
import {
  TimetableSlot,
  TimetableSlotSchema,
} from '../timetable/schemas/timetable-slot.schema';
import {
  AttendanceSession,
  AttendanceSessionSchema,
} from '../attendance/schemas/attendance-session.schema';
import {
  GradebookEntry,
  GradebookEntrySchema,
} from '../gradebook/schemas/gradebook-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Teacher.name,
        schema: TeacherSchema,
      },
      {
        name: Course.name,
        schema: CourseSchema,
      },
      {
        name: Assignment.name,
        schema: AssignmentSchema,
      },
      {
        name: Quiz.name,
        schema: QuizSchema,
      },
      {
        name: TimetableSlot.name,
        schema: TimetableSlotSchema,
      },
      {
        name: AttendanceSession.name,
        schema: AttendanceSessionSchema,
      },
      {
        name: GradebookEntry.name,
        schema: GradebookEntrySchema,
      },
    ]),
    UsersModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
