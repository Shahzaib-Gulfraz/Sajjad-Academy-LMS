import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
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
import { NotificationsService } from './notifications.service';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { MarkAllNotificationsReadDto } from './dto/mark-all-notifications-read.dto';
import {
  MarkAllNotificationsReadResponseDto,
  MarkNotificationReadResponseDto,
  NotificationsListResponseDto,
} from './dto/notifications-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'classGrade', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiOkResponse({
    description: 'Notifications list with read status.',
    type: NotificationsListResponseDto,
  })
  async listNotifications(
    @CurrentUser() actor: RequestUser,
    @Query('classGrade') classGrade?: string,
    @Query('studentId') studentId?: string,
  ) {
    return {
      data: await this.notificationsService.listNotifications({
        userId: actor.sub,
        classGrade,
        studentId,
      }),
    };
  }

  @Patch('read')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiBody({ type: MarkNotificationReadDto })
  @ApiOkResponse({
    description: 'Notification read status updated.',
    type: MarkNotificationReadResponseDto,
  })
  async markRead(
    @CurrentUser() actor: RequestUser,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return {
      data: await this.notificationsService.markRead(
        actor.sub,
        dto.notificationId,
      ),
    };
  }

  @Patch('read-all')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiBody({ type: MarkAllNotificationsReadDto })
  @ApiOkResponse({
    description: 'Bulk read status update result.',
    type: MarkAllNotificationsReadResponseDto,
  })
  async markAllRead(
    @CurrentUser() actor: RequestUser,
    @Body() dto: MarkAllNotificationsReadDto,
  ) {
    return {
      data: await this.notificationsService.markAllRead(
        actor.sub,
        dto.notificationIds ?? [],
      ),
    };
  }
}
