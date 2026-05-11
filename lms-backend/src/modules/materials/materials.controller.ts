import {
  Body,
  Controller,
  Delete,
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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateMaterialRecordDto,
  UpsertCourseOverviewDto,
  UpdateCourseOverviewDto,
  UpdateMaterialDto,
  PatchRecommendedBooksDto,
} from './dto/create-material.dto';
import { QueryMaterialsDto } from './dto/query-materials.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials')
@ApiBearerAuth('bearer')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // NOTE: POST /materials (standalone create) has been removed.
  // Use POST /materials/course/:courseId to create materials tied to a course.

  @Get('materials')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'List materials with filters' })
  @ApiOkResponse()
  async list(
    @Query() query: QueryMaterialsDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.list(query, actor),
    };
  }

  @Get('materials/course/:courseId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List materials for a course (alt path)' })
  @ApiOkResponse()
  async listByCourseAlt(
    @Param('courseId') courseId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.listByCourse(courseId, actor),
    };
  }

  @Post('materials/course/:courseId/overview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create or update course overview in materials collection' })
  @ApiOkResponse()
  async upsertOverview(
    @Param('courseId') courseId: string,
    @Body() dto: UpsertCourseOverviewDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.upsertOverview(courseId, dto, actor),
    };
  }

  @Patch('materials/course/:courseId/overview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update existing course overview' })
  @ApiOkResponse()
  async updateOverview(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseOverviewDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.updateOverview(courseId, dto, actor),
    };
  }

  @Patch('materials/course/:courseId/overview/recommended-books')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Add or update recommended books to existing overview' })
  @ApiOkResponse()
  async patchRecommendedBooks(
    @Param('courseId') courseId: string,
    @Body() dto: PatchRecommendedBooksDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.patchRecommendedBooks(courseId, dto, actor),
    };
  }

  @Post('materials/course/:courseId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create material in materials collection' })
  @ApiOkResponse()
  async createForCourse(
    @Param('courseId') courseId: string,
    @Body() dto: CreateMaterialRecordDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.create(
        {
          ...dto,
          courseId,
        },
        actor,
      ),
    };
  }

  @Delete('materials/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete material and attempt Cloudinary file delete by publicId' })
  @ApiOkResponse()
  async remove(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return {
      data: await this.materialsService.remove(id, actor),
    };
  }

  @Patch('materials/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update an existing material record' })
  @ApiOkResponse()
  async updateMaterial(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.materialsService.update(id, dto, actor),
    };
  }
}
