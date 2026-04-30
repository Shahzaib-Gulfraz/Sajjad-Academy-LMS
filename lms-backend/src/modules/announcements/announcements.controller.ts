import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import {
  AnnouncementResponseDto,
  AnnouncementsListResponseDto,
  DeleteAnnouncementResponseDto,
} from './dto/announcements-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('announcements')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create announcement' })
  @ApiBody({ type: CreateAnnouncementDto })
  @ApiOkResponse({ type: AnnouncementResponseDto })
  async createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.announcementsService.createAnnouncement(dto, actor),
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List announcements' })
  @ApiQuery({ name: 'classGrade', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiOkResponse({ type: AnnouncementsListResponseDto })
  async listAnnouncements(
    @CurrentUser() actor: RequestUser,
    @Query('classGrade') classGrade?: string,
    @Query('studentId') studentId?: string,
  ) {
    return {
      data: await this.announcementsService.listAnnouncements(
        {
          classGrade,
          studentId,
        },
        actor,
      ),
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiOkResponse({ type: DeleteAnnouncementResponseDto })
  async deleteAnnouncement(@Param('id') id: string) {
    return {
      data: await this.announcementsService.deleteAnnouncement(id),
    };
  }
}
