import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Teacher, TeacherSchema } from './schemas/teacher.schema';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { UsersModule } from '../users/users.module';
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
import { LeaveRequest, LeaveRequestSchema } from '../leaves/schemas/leave-request.schema';
import { SchoolClass, SchoolClassSchema } from '../classes/schemas/class.schema';
import { Material, MaterialSchema } from '../materials/schemas/material.schema';
import { Course, CourseSchema } from '../materials/schemas/courses.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Teacher.name,
        schema: TeacherSchema,
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
      {
        name: LeaveRequest.name,
        schema: LeaveRequestSchema,
      },
      {
        name: SchoolClass.name,
        schema: SchoolClassSchema,
      },
      {
        name: Material.name,
        schema: MaterialSchema,
      },
      {
        name: Course.name,
        schema: CourseSchema,
      },
    ]),
    UsersModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
