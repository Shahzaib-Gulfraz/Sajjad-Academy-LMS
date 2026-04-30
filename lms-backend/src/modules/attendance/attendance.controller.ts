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
import { AttendanceService } from './attendance.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UpdateAttendanceEntryDto } from './dto/update-attendance-entry.dto';
import {
  AttendanceSessionResponseDto,
  AttendanceSessionsListResponseDto,
  StudentAttendanceListResponseDto,
} from './dto/attendance-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('attendance')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('sessions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create attendance session' })
  @ApiBody({ type: CreateAttendanceSessionDto })
  @ApiOkResponse({ type: AttendanceSessionResponseDto })
  async createSession(
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.attendanceService.createSession(dto, actor),
    };
  }

  @Get('sessions')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List attendance sessions' })
  @ApiQuery({ name: 'class', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiOkResponse({ type: AttendanceSessionsListResponseDto })
  async listSessions(
    @Query('class') className?: string,
    @Query('date') date?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return {
      data: await this.attendanceService.listSessions({
        className,
        date,
        teacherId,
      }),
    };
  }

  @Get('students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get attendance for a student' })
  @ApiOkResponse({ type: StudentAttendanceListResponseDto })
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.attendanceService.getStudentAttendance(studentId, actor),
    };
  }

  @Patch('entries/:sessionId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update attendance entry status' })
  @ApiBody({ type: UpdateAttendanceEntryDto })
  @ApiOkResponse({ type: AttendanceSessionResponseDto })
  async updateEntry(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateAttendanceEntryDto,
  ) {
    return {
      data: await this.attendanceService.updateEntry(sessionId, dto),
    };
  }
}
