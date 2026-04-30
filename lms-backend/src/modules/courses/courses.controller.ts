import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CreateChapterDto,
  CreateEnrollmentDto,
  CreateMaterialDto,
  CreateTopicDto,
  ToggleTopicCompletionDto,
  UpdateChapterDto,
  UpdateMaterialDto,
  UpdateTopicDto,
  UpsertOverviewDto,
} from './dto/course-management.dto';
import {
  CoursesListResponseDto,
  SingleCourseResponseDto,
} from './dto/course-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';
import { StudentsService } from '../students/students.service';

@ApiTags('courses')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly studentsService: StudentsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List all courses' })
  @ApiQuery({ name: 'grade', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiOkResponse({ type: CoursesListResponseDto })
  async findAll(
    @Query('grade') grade?: string,
    @Query('status') status?: string,
  ) {
    return {
      data: await this.coursesService.findAll({ grade, status }),
    };
  }

  @Get('student/enrolled')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get courses for logged-in student' })
  @ApiOkResponse({ type: CoursesListResponseDto })
  async getStudentCourses(@CurrentUser() actor: RequestUser) {
    const student = await this.studentsService.findByUserId(actor.sub);

    // First preference: explicit enrollment documents.
    const byEnrollment = await this.coursesService.findByEnrollmentStudentId(
      student._id.toString(),
    );
    if (byEnrollment.length > 0) {
      return {
        data: byEnrollment,
      };
    }

    // Backward-compatible fallback: referenced course IDs on student record.
    if (student.enrolledCourseIds && student.enrolledCourseIds.length > 0) {
      const byCourseIds = await this.coursesService.findByCourseIds(
        student.enrolledCourseIds,
      );
      if (byCourseIds.length > 0) {
        return {
          data: byCourseIds,
        };
      }
    }

    // Compatibility fallback: some legacy rows stored course IDs in enrolledCourses.
    if (student.enrolledCourses && student.enrolledCourses.length > 0) {
      const byLegacyIds = await this.coursesService.findByCourseIds(
        student.enrolledCourses,
      );
      if (byLegacyIds.length > 0) {
        return {
          data: byLegacyIds,
        };
      }
    }

    // Legacy fallback: subject/course names on student profile.
    if (student.enrolledCourses && student.enrolledCourses.length > 0) {
      const byEnrolledCourseNames = await this.coursesService.findByEnrolledCourses(
        student.enrolledCourses,
      );
      if (byEnrolledCourseNames.length > 0) {
        return {
          data: byEnrolledCourseNames,
        };
      }
    }

    // Last fallback to grade-based active courses.
    return {
      data: await this.coursesService.findByStudentGrade(student.grade.toString()),
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get course details' })
  @ApiOkResponse({ type: SingleCourseResponseDto })
  async findOne(@Param('id') id: string) {
    return {
      data: await this.coursesService.findById(id),
    };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiOkResponse({ type: SingleCourseResponseDto })
  @ApiConflictErrorResponse('Course with this code already exists.')
  @ApiUnprocessableErrorResponse('Course payload failed domain rules.')
  async create(@Body() dto: CreateCourseDto) {
    return { data: await this.coursesService.create(dto) };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update course' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiOkResponse({ type: SingleCourseResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return { data: await this.coursesService.update(id, dto) };
  }

  @Patch(':id/overview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update course overview and weekly schedule' })
  async upsertOverview(
    @Param('id') id: string,
    @Body() dto: UpsertOverviewDto,
  ) {
    return {
      data: await this.coursesService.updateOverview(id, {
        title: dto.title,
        description: dto.description,
        learningOutcomes: dto.learningOutcomes,
        objectives: dto.objectives,
        thumbnailUrl: dto.thumbnailUrl,
        thumbnailPublicId: dto.thumbnailPublicId,
        weeklySchedule: dto.weeklySchedule,
        recentMaterials: dto.recentMaterials,
      }),
    };
  }

  @Post(':id/chapters')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add chapter to course' })
  async addChapter(@Param('id') id: string, @Body() dto: CreateChapterDto) {
    return { data: await this.coursesService.addChapter(id, dto) };
  }

  @Patch(':id/chapters/:chapterId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update chapter in course' })
  async updateChapter(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return {
      data: await this.coursesService.updateChapter(id, chapterId, dto),
    };
  }

  @Delete(':id/chapters/:chapterId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete chapter from course' })
  async removeChapter(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
  ) {
    return { data: await this.coursesService.removeChapter(id, chapterId) };
  }

  @Post(':id/chapters/:chapterId/topics')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add topic to chapter' })
  async addTopic(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: CreateTopicDto,
  ) {
    return { data: await this.coursesService.addTopic(id, chapterId, dto) };
  }

  @Patch(':id/chapters/:chapterId/topics/:topicId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update topic in chapter' })
  async updateTopic(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Param('topicId') topicId: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return {
      data: await this.coursesService.updateTopic(id, chapterId, topicId, dto),
    };
  }

  @Delete(':id/chapters/:chapterId/topics/:topicId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete topic from chapter' })
  async removeTopic(
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Param('topicId') topicId: string,
  ) {
    return {
      data: await this.coursesService.removeTopic(id, chapterId, topicId),
    };
  }

  @Post(':id/materials')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add material to course/chapter/topic' })
  async addMaterial(@Param('id') id: string, @Body() dto: CreateMaterialDto) {
    return { data: await this.coursesService.addMaterial(id, dto) };
  }

  @Patch(':id/materials/:materialId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update material' })
  async updateMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
  ) {
    return {
      data: await this.coursesService.updateMaterial(id, materialId, dto),
    };
  }

  @Delete(':id/materials/:materialId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete material' })
  async removeMaterial(
    @Param('id') id: string,
    @Param('materialId') materialId: string,
  ) {
    return {
      data: await this.coursesService.removeMaterial(id, materialId),
    };
  }

  @Get(':id/enrollments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List course enrollments' })
  async listEnrollments(@Param('id') id: string) {
    return { data: await this.coursesService.listEnrollments(id) };
  }

  @Post(':id/enrollments')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Enroll student in course' })
  async enrollStudent(
    @Param('id') id: string,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return {
      data: await this.coursesService.enrollStudent(id, dto.studentId),
    };
  }

  @Delete(':id/enrollments/:enrollmentId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove course enrollment' })
  async removeEnrollment(
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return {
      data: await this.coursesService.removeEnrollment(id, enrollmentId),
    };
  }

  @Patch(':id/progress/topics/toggle')
  @HttpCode(200)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Toggle topic completion and recalculate progress' })
  async toggleTopicCompletion(
    @Param('id') id: string,
    @Body() dto: ToggleTopicCompletionDto,
    @CurrentUser() actor: RequestUser,
  ) {
    const student = await this.studentsService.findByUserId(actor.sub);
    return {
      data: await this.coursesService.toggleTopicCompletion(
        id,
        student._id.toString(),
        dto.topicId,
        dto.completed ?? true,
      ),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete course' })
  async remove(@Param('id') id: string) {
    return { data: await this.coursesService.remove(id) };
  }
}
