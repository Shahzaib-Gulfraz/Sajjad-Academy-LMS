import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { GradebookService } from './gradebook.service';
import { CreateGradebookEntryDto } from './dto/create-gradebook-entry.dto';
import { UpdateGradebookEntryDto } from './dto/update-gradebook-entry.dto';
import {
  GradebookDeleteResponseDto,
  GradebookEntriesListResponseDto,
  GradebookEntryResponseDto,
  StudentGradebookResponseDto,
} from './dto/gradebook-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('gradebook')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('gradebook')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post('entries')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create gradebook entry' })
  @ApiBody({ type: CreateGradebookEntryDto })
  @ApiOkResponse({ type: GradebookEntryResponseDto })
  async createEntry(
    @Body() dto: CreateGradebookEntryDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.gradebookService.createEntry(dto, actor.sub),
    };
  }

  @Get('entries')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List gradebook entries' })
  @ApiQuery({ name: 'classGrade', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: GradebookEntriesListResponseDto })
  async listEntries(
    @Query('classGrade') classGrade?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subject') subject?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return {
      data: await this.gradebookService.listEntries({
        classGrade,
        teacherId,
        subject,
        page,
        pageSize,
      }),
    };
  }

  @Patch('entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update gradebook entry' })
  @ApiBody({ type: UpdateGradebookEntryDto })
  @ApiOkResponse({ type: GradebookEntryResponseDto })
  async updateEntry(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateGradebookEntryDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.gradebookService.updateEntry(entryId, dto, actor),
    };
  }

  @Delete('entries/:entryId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete gradebook entry' })
  @ApiOkResponse({ type: GradebookDeleteResponseDto })
  async deleteEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.gradebookService.deleteEntry(entryId, actor),
    };
  }

  @Get('students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get gradebook entries for a student' })
  @ApiOkResponse({ type: StudentGradebookResponseDto })
  async getStudentEntries(
    @Param('studentId') studentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.gradebookService.getStudentEntries(studentId, actor),
    };
  }
}
