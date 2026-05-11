import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schemas/student.schema';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { UsersModule } from '../users/users.module';
import {
  AssignmentSubmission,
  AssignmentSubmissionSchema,
} from '../assignments/schemas/assignment-submission.schema';
import {
  QuizSubmission,
  QuizSubmissionSchema,
} from '../quizzes/schemas/quiz-submission.schema';
import {
  AttendanceSession,
  AttendanceSessionSchema,
} from '../attendance/schemas/attendance-session.schema';
import {
  FeeInvoice,
  FeeInvoiceSchema,
} from '../fees/schemas/fee-invoice.schema';
import {
  FeeTransaction,
  FeeTransactionSchema,
} from '../fees/schemas/fee-transaction.schema';
import {
  GradebookEntry,
  GradebookEntrySchema,
} from '../gradebook/schemas/gradebook-entry.schema';
import {
  Announcement,
  AnnouncementSchema,
} from '../announcements/schemas/announcement.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/schemas/leave-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Student.name,
        schema: StudentSchema,
      },
      {
        name: AssignmentSubmission.name,
        schema: AssignmentSubmissionSchema,
      },
      {
        name: QuizSubmission.name,
        schema: QuizSubmissionSchema,
      },
      {
        name: AttendanceSession.name,
        schema: AttendanceSessionSchema,
      },
      {
        name: FeeInvoice.name,
        schema: FeeInvoiceSchema,
      },
      {
        name: FeeTransaction.name,
        schema: FeeTransactionSchema,
      },
      {
        name: GradebookEntry.name,
        schema: GradebookEntrySchema,
      },
      {
        name: Announcement.name,
        schema: AnnouncementSchema,
      },
      {
        name: LeaveRequest.name,
        schema: LeaveRequestSchema,
      },
    ]),
    UsersModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
