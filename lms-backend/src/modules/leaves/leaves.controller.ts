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
import { LeavesService } from './leaves.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import {
  LeaveRequestResponseDto,
  LeaveRequestsListResponseDto,
} from './dto/leaves-response.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('leaves')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post('requests')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create leave request' })
  @ApiBody({ type: CreateLeaveRequestDto })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async createLeave(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.leavesService.createLeave(dto, actor),
    };
  }

  @Get('requests')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List leave requests' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'requesterRole', required: false, type: String })
  @ApiOkResponse({ type: LeaveRequestsListResponseDto })
  async listLeaves(
    @CurrentUser() actor: RequestUser,
    @Query('status') status?: string,
    @Query('requesterRole') requesterRole?: UserRole,
  ) {
    if (actor.role === UserRole.ADMIN) {
      return {
        data: await this.leavesService.listLeaves({ status, requesterRole }),
      };
    }

    if (actor.role === UserRole.TEACHER && requesterRole === UserRole.STUDENT) {
      return {
        data: await this.leavesService.listLeaves({
          status,
          requesterRole: UserRole.STUDENT,
        }),
      };
    }

    return {
      data: await this.leavesService.listLeaves({
        status,
        requesterRole: actor.role,
        requesterUserId: actor.sub,
      }),
    };
  }

  @Patch('requests/:leaveId/status')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update leave request status' })
  @ApiBody({ type: UpdateLeaveStatusDto })
  @ApiOkResponse({ type: LeaveRequestResponseDto })
  async updateStatus(
    @Param('leaveId') leaveId: string,
    @Body() dto: UpdateLeaveStatusDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return {
      data: await this.leavesService.updateStatus(leaveId, dto, actor.sub),
    };
  }
}
