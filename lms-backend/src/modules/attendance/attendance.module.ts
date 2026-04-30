import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AttendanceSession,
  AttendanceSessionSchema,
} from './schemas/attendance-session.schema';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AttendanceSession.name,
        schema: AttendanceSessionSchema,
      },
    ]),
    StudentsModule,
  ],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
