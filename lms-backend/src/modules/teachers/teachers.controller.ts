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
import { TeachersService } from './teachers.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UpdateTeacherSelfDto } from './dto/update-teacher-self.dto';
import {
  TeacherDeleteResponseDto,
  TeacherResetPasswordResponseDto,
  TeachersListResponseDto,
  TeacherSingleResponseDto,
} from './dto/teachers-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('teachers')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get current teacher profile' })
  @ApiOkResponse({ type: TeacherSingleResponseDto })
  async me(@CurrentUser() actor: RequestUser) {
    return {
      data: await this.teachersService.findByEmail(actor.email),
    };
  }

  @Patch('me')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update current teacher profile' })
  @ApiBody({ type: UpdateTeacherSelfDto })
  @ApiOkResponse({ type: TeacherSingleResponseDto })
  async updateMe(
    @CurrentUser() actor: RequestUser,
    @Body() dto: UpdateTeacherSelfDto,
  ) {
    return {
      data: await this.teachersService.updateByEmail(actor.email, dto),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List teachers' })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ type: TeachersListResponseDto })
  async findAll(
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return {
      data: await this.teachersService.findAll({ subject, status, search }),
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create teacher' })
  @ApiBody({ type: CreateTeacherDto })
  @ApiOkResponse({ type: TeacherSingleResponseDto })
  @ApiConflictErrorResponse('Teacher with this employee number already exists.')
  @ApiUnprocessableErrorResponse('Teacher payload failed domain rules.')
  async create(@Body() dto: CreateTeacherDto) {
    return {
      data: await this.teachersService.create(dto),
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update teacher' })
  @ApiBody({ type: UpdateTeacherDto })
  @ApiOkResponse({ type: TeacherSingleResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return {
      data: await this.teachersService.update(id, dto),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete teacher' })
  @ApiOkResponse({ type: TeacherDeleteResponseDto })
  async remove(@Param('id') id: string) {
    return {
      data: await this.teachersService.remove(id),
    };
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset teacher password' })
  @ApiOkResponse({ type: TeacherResetPasswordResponseDto })
  async resetPassword(@Param('id') id: string) {
    return {
      data: await this.teachersService.resetPassword(id),
    };
  }
}
