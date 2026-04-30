import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Param,
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
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentSelfDto } from './dto/update-student-self.dto';
import {
  StudentsListResponseDto,
  StudentDeleteResponseDto,
  StudentResetPasswordResponseDto,
  StudentSingleResponseDto,
} from './dto/students-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('students')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get logged-in student profile' })
  @ApiOkResponse({ type: StudentSingleResponseDto })
  async findMe(@CurrentUser() actor: RequestUser) {
    return {
      data: await this.studentsService.getProfile(actor.sub),
    };
  }

  @Patch('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Update logged-in student profile' })
  @ApiBody({ type: UpdateStudentSelfDto })
  @ApiOkResponse({ type: StudentSingleResponseDto })
  async updateMe(
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpdateStudentSelfDto,
  ) {
    return {
      data: await this.studentsService.updateByUserId(actor.sub, dto),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List students' })
  @ApiQuery({ name: 'class', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ type: StudentsListResponseDto })
  async findAll(
    @Query('class') className?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return {
      data: await this.studentsService.findAll({ className, status, search }),
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create student' })
  @ApiBody({ type: CreateStudentDto })
  @ApiOkResponse({ type: StudentSingleResponseDto })
  @ApiConflictErrorResponse(
    'Student with this admission number already exists.',
  )
  @ApiUnprocessableErrorResponse('Student payload failed domain rules.')
  async create(@Body() dto: CreateStudentDto) {
    return {
      data: await this.studentsService.create(dto),
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update student' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiOkResponse({ type: StudentSingleResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return {
      data: await this.studentsService.update(id, dto),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete student' })
  @ApiOkResponse({ type: StudentDeleteResponseDto })
  async remove(@Param('id') id: string) {
    return {
      data: await this.studentsService.remove(id),
    };
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset student password' })
  @ApiOkResponse({ type: StudentResetPasswordResponseDto })
  async resetPassword(@Param('id') id: string) {
    return {
      data: await this.studentsService.resetPassword(id),
    };
  }
}
