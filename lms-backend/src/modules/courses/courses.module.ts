import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from './schemas/course.schema';
import {
  CourseEnrollment,
  CourseEnrollmentSchema,
} from './schemas/enrollment.schema';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { StudentsModule } from '../students/students.module';
import { Student, StudentSchema } from '../students/schemas/student.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: CourseEnrollment.name, schema: CourseEnrollmentSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
    StudentsModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
