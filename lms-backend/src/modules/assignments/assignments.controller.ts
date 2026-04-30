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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateAssignmentSubmissionDto } from './dto/create-assignment-submission.dto';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto';
import {
  AssignmentSingleResponseDto,
  AssignmentsListResponseDto,
  AssignmentSubmissionResponseDto,
  AssignmentSubmissionsListResponseDto,
} from './dto/assignments-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('assignments')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create assignment' })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiOkResponse({ type: AssignmentSingleResponseDto })
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.assignmentsService.createAssignment(dto, actor),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List assignments' })
  @ApiQuery({ name: 'classGrade', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiOkResponse({ type: AssignmentsListResponseDto })
  async listAssignments(
    @Query('classGrade') classGrade?: string,
    @Query('teacherId') teacherId?: string,
    @Query('studentId') studentId?: string,
    @Query('subject') subject?: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    return {
      data: await this.assignmentsService.listAssignments(
        {
          classGrade,
          teacherId,
          studentId,
          subject,
        },
        actor,
      ),
    };
  }

  @Get('submissions/list')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List assignment submissions' })
  @ApiQuery({ name: 'assignmentId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiOkResponse({ type: AssignmentSubmissionsListResponseDto })
  async listSubmissions(
    @Query('assignmentId') assignmentId?: string,
    @Query('studentId') studentId?: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    return {
      data: await this.assignmentsService.listSubmissions(
        {
          assignmentId,
          studentId,
        },
        actor,
      ),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get single assignment' })
  @ApiOkResponse({ type: AssignmentSingleResponseDto })
  async getAssignment(
    @Param('id') id: string,
    @CurrentUser() actor?: RequestUser,
  ) {
    return {
      data: await this.assignmentsService.getAssignment(id, actor),
    };
  }

  @Post(':id/submissions')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit assignment' })
  @ApiBody({ type: CreateAssignmentSubmissionDto })
  @ApiOkResponse({ type: AssignmentSubmissionResponseDto })
  @ApiConflictErrorResponse('Assignment already submitted for this student.')
  @ApiUnprocessableErrorResponse('Submission payload failed domain rules.')
  async submitAssignment(
    @Param('id') id: string,
    @Body() dto: CreateAssignmentSubmissionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.assignmentsService.submitAssignment(id, dto, actor),
    };
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Grade assignment submission' })
  @ApiBody({ type: GradeAssignmentSubmissionDto })
  @ApiOkResponse({ type: AssignmentSubmissionResponseDto })
  async gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeAssignmentSubmissionDto,
  ) {
    return {
      data: await this.assignmentsService.gradeSubmission(submissionId, dto),
    };
  }
}
