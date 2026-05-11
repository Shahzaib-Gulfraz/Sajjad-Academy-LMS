import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  AddChapterDto,
  UpdateChapterDto,
  AddTopicDto,
} from './dto/courses.dto';

@ApiTags('materials/courses')
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@Body() dto: CreateCourseDto, @CurrentUser() actor: RequestUser) {
    return {
      data: await this.coursesService.create(dto, actor),
    };
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return {
      data: await this.coursesService.findOne(id, actor),
    };
  }

  @Get('by-class-subject/:classId/:subjectId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findByClassAndSubject(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.findByClassAndSubject(
        classId,
        subjectId,
        actor,
      ),
    };
  }

  @Post('ensure/:classId/:subjectId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async ensureByClassAndSubject(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Body() body: { name?: string },
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.ensureByClassAndSubject(
        classId,
        subjectId,
        body?.name ?? '',
        actor,
      ),
    };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.update(id, dto, actor),
    };
  }

  @Post(':id/chapters')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async addChapter(
    @Param('id') id: string,
    @Body() dto: AddChapterDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.addChapter(id, dto, actor),
    };
  }

  @Patch(':id/chapters/:chapterId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateChapter(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.updateChapter(id, chapterId, dto, actor),
    };
  }

  @Delete(':id/chapters/:chapterId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteChapter(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.deleteChapter(id, chapterId, actor),
    };
  }

  @Post(':id/chapters/:chapterId/topics')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async addTopic(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: AddTopicDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.addTopic(id, chapterId, dto, actor),
    };
  }

  @Delete(':id/chapters/:chapterId/topics/:topicId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteTopic(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Param('topicId') topicId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.coursesService.deleteTopic(id, chapterId, topicId, actor),
    };
  }
}
