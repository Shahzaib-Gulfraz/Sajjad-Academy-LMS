import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Student, StudentSchema } from '../students/schemas/student.schema';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import {
  AttendanceSession,
  AttendanceSessionSchema,
} from '../attendance/schemas/attendance-session.schema';
import {
  FeeTransaction,
  FeeTransactionSchema,
} from '../fees/schemas/fee-transaction.schema';
import {
  FeeInvoice,
  FeeInvoiceSchema,
} from '../fees/schemas/fee-invoice.schema';
import {
  GradebookEntry,
  GradebookEntrySchema,
} from '../gradebook/schemas/gradebook-entry.schema';
import { SchoolClass, SchoolClassSchema } from '../classes/schemas/class.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: AttendanceSession.name, schema: AttendanceSessionSchema },
      { name: FeeTransaction.name, schema: FeeTransactionSchema },
      { name: FeeInvoice.name, schema: FeeInvoiceSchema },
      { name: GradebookEntry.name, schema: GradebookEntrySchema },
      { name: SchoolClass.name, schema: SchoolClassSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
