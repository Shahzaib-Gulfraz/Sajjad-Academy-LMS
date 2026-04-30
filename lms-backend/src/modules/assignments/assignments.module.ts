import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import {
  AssignmentSubmission,
  AssignmentSubmissionSchema,
} from './schemas/assignment-submission.schema';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
      { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
    ]),
    StudentsModule,
  ],
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
