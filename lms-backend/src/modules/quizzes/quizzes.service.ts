import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '../../common/auth/roles.enum';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import {
  QuizSubmission,
  QuizSubmissionDocument,
} from './schemas/quiz-submission.schema';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { ReviewQuizSubmissionDto } from './dto/review-quiz-submission.dto';
import { StudentsService } from '../students/students.service';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(QuizSubmission.name)
    private readonly submissionModel: Model<QuizSubmissionDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async createQuiz(
    dto: CreateQuizDto,
    actor: { sub: string; role: UserRole; email: string },
  ) {
    if (actor.role !== UserRole.TEACHER && actor.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only teachers or admins can create quizzes.',
      );
    }

    const quiz = await this.quizModel.create({
      ...dto,
      teacherId: actor.sub,
      teacherName: actor.email,
    });

    return this.toQuizResponse(quiz);
  }

  async listQuizzes(
    query: {
      classGrade?: string;
      teacherId?: string;
      subject?: string;
    },
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    let scopedClassGrade = query.classGrade;

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      scopedClassGrade = student.grade.toString();
    }

    const filter: Record<string, unknown> = {};
    if (scopedClassGrade) filter.classGrade = scopedClassGrade;
    if (query.teacherId) filter.teacherId = query.teacherId;
    if (query.subject) filter.subject = query.subject;

    const quizzes = await this.quizModel
      .find(filter)
      .sort({ dueDate: 1 })
      .exec();
    return quizzes.map((quiz) => this.toQuizResponse(quiz));
  }

  async getQuiz(
    id: string,
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    const quiz = await this.quizModel.findById(id).exec();
    if (!quiz) {
      throw new NotFoundException('Quiz not found.');
    }

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      if (quiz.classGrade !== student.grade.toString()) {
        throw new NotFoundException('Quiz not found.');
      }
    }

    return this.toQuizResponse(quiz);
  }

  async listSubmissions(
    query: {
      quizId?: string;
      studentId?: string;
      teacherId?: string;
    },
    actor?: { sub: string; role: UserRole; email: string },
  ) {
    let scopedStudentId = query.studentId;

    if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      scopedStudentId = student._id.toString();
    }

    const filter: Record<string, unknown> = {};

    if (query.quizId) {
      filter.quizId = query.quizId;
    }

    if (scopedStudentId) {
      filter.studentId = scopedStudentId;
    }

    if (query.teacherId) {
      const teacherQuizzes = await this.quizModel
        .find({ teacherId: query.teacherId })
        .select({ _id: 1 })
        .lean()
        .exec();
      const quizIds = teacherQuizzes.map((quiz) => quiz._id.toString());
      filter.quizId = { $in: quizIds };
    }

    const submissions = await this.submissionModel
      .find(filter)
      .sort({ submittedAt: -1 })
      .exec();

    return submissions.map((submission) =>
      this.toSubmissionResponse(submission),
    );
  }

  async submitQuiz(
    quizId: string,
    dto: CreateQuizSubmissionDto,
    actor: { sub: string; role: UserRole; email: string },
  ) {
    if (actor.role !== UserRole.STUDENT && actor.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only students can submit quizzes.');
    }

    const effectiveStudentId =
      actor.role === UserRole.STUDENT
        ? (await this.studentsService.findByUserId(actor.sub))._id.toString()
        : dto.studentId;

    const quiz = await this.quizModel.findById(quizId).exec();
    if (!quiz) {
      throw new NotFoundException('Quiz not found.');
    }

    const existing = await this.submissionModel.exists({
      quizId,
      studentId: effectiveStudentId,
    });
    if (existing) {
      throw new ConflictException('Quiz already submitted for this student.');
    }

    const answersMap = new Map(
      dto.answers.map((item) => [item.questionId, item.selectedOptionId]),
    );

    let score = 0;
    for (const question of quiz.questions) {
      const selected = answersMap.get(question.id);
      if (selected && selected === question.correctOptionId) {
        score += 1;
      }
    }

    const submission = await this.submissionModel.create({
      quizId,
      studentId: effectiveStudentId,
      submittedAt: new Date().toISOString(),
      answers: dto.answers,
      score,
      total: quiz.questions.length,
      checked: true,
    });

    return this.toSubmissionResponse(submission);
  }

  async reviewSubmission(submissionId: string, dto: ReviewQuizSubmissionDto) {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) {
      throw new NotFoundException('Submission not found.');
    }

    submission.score = dto.score;
    submission.checked = dto.checked;
    submission.teacherFeedback = dto.teacherFeedback;

    await submission.save();
    return this.toSubmissionResponse(submission);
  }

  private toQuizResponse(quiz: QuizDocument) {
    return {
      id: quiz._id.toString(),
      title: quiz.title,
      description: quiz.description,
      classGrade: quiz.classGrade,
      chapterName: quiz.chapterName,
      topicName: quiz.topicName,
      dueDate: quiz.dueDate,
      teacherId: quiz.teacherId,
      teacherName: quiz.teacherName,
      subject: quiz.subject,
      questions: quiz.questions,
    };
  }

  private toSubmissionResponse(submission: QuizSubmissionDocument) {
    return {
      id: submission._id.toString(),
      quizId: submission.quizId,
      studentId: submission.studentId,
      submittedAt: submission.submittedAt,
      score: submission.score,
      total: submission.total,
      checked: submission.checked,
      teacherFeedback: submission.teacherFeedback,
      answers: submission.answers,
    };
  }
}
