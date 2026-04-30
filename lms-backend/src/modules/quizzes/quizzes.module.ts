import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quiz, QuizSchema } from './schemas/quiz.schema';
import {
  QuizSubmission,
  QuizSubmissionSchema,
} from './schemas/quiz-submission.schema';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizSubmission.name, schema: QuizSubmissionSchema },
    ]),
    StudentsModule,
  ],
  providers: [QuizzesService],
  controllers: [QuizzesController],
  exports: [QuizzesService],
})
export class QuizzesModule {}
