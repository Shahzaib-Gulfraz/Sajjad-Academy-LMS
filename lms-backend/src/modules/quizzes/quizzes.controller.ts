import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { ReviewQuizSubmissionDto } from './dto/review-quiz-submission.dto';
import {
  QuizSingleResponseDto,
  QuizzesListResponseDto,
  QuizSubmissionResponseDto,
  QuizSubmissionsListResponseDto,
} from './dto/quizzes-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('quizzes')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create quiz' })
  @ApiBody({ type: CreateQuizDto })
  @ApiOkResponse({ type: QuizSingleResponseDto })
  async createQuiz(
    @Body() dto: CreateQuizDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.quizzesService.createQuiz(dto, actor),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List quizzes' })
  @ApiQuery({ name: 'classGrade', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiOkResponse({ type: QuizzesListResponseDto })
  async listQuizzes(
    @Query('classGrade') classGrade?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subject') subject?: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    return {
      data: await this.quizzesService.listQuizzes(
        {
          classGrade,
          teacherId,
          subject,
        },
        actor,
      ),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get single quiz' })
  @ApiOkResponse({ type: QuizSingleResponseDto })
  async getQuiz(@Param('id') id: string, @CurrentUser() actor?: RequestUser) {
    return {
      data: await this.quizzesService.getQuiz(id, actor),
    };
  }

  @Get('submissions/list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List quiz submissions' })
  @ApiQuery({ name: 'quizId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiOkResponse({ type: QuizSubmissionsListResponseDto })
  async listSubmissions(
    @Query('quizId') quizId?: string,
    @Query('studentId') studentId?: string,
    @Query('teacherId') teacherId?: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    return {
      data: await this.quizzesService.listSubmissions(
        {
          quizId,
          studentId,
          teacherId,
        },
        actor,
      ),
    };
  }

  @Post(':id/submissions')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit quiz answers' })
  @ApiBody({ type: CreateQuizSubmissionDto })
  @ApiOkResponse({ type: QuizSubmissionResponseDto })
  @ApiConflictErrorResponse('Quiz already submitted for this student.')
  @ApiUnprocessableErrorResponse('Submission payload failed domain rules.')
  async submitQuiz(
    @Param('id') id: string,
    @Body() dto: CreateQuizSubmissionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.quizzesService.submitQuiz(id, dto, actor),
    };
  }

  @Patch('submissions/:submissionId/review')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Review quiz submission' })
  @ApiBody({ type: ReviewQuizSubmissionDto })
  @ApiOkResponse({ type: QuizSubmissionResponseDto })
  async reviewSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewQuizSubmissionDto,
  ) {
    return {
      data: await this.quizzesService.reviewSubmission(submissionId, dto),
    };
  }
}
