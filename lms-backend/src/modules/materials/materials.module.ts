import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchoolClass, SchoolClassSchema } from '../classes/schemas/class.schema';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { Material, MaterialSchema } from './schemas/material.schema';
import { Course, CourseSchema } from './schemas/courses.schema';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: SchoolClass.name, schema: SchoolClassSchema },
      { name: Student.name, schema: StudentSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [MaterialsController, CoursesController],
  providers: [MaterialsService, CoursesService],
  exports: [MaterialsService, CoursesService],
})
export class MaterialsModule {}
