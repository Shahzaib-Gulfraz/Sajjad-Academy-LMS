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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import {
  DeleteTimetableSlotResponseDto,
  TimetableSlotListResponseDto,
  TimetableSlotResponseDto,
} from './dto/timetable-response.dto';
import { TimetableService } from './timetable.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { ApiCommonErrorResponses } from '../../common/swagger/api-error-responses.decorator';

@ApiTags('timetable')
@ApiBearerAuth('bearer')
@ApiCommonErrorResponses()
@Controller('timetable')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('slots')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  @ApiOperation({ summary: 'List timetable slots' })
  @ApiQuery({ name: 'weekStart', required: false, type: String })
  @ApiQuery({ name: 'weekEnd', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'className', required: false, type: String })
  @ApiOkResponse({ type: TimetableSlotListResponseDto })
  async listSlots(
    @CurrentUser() actor: RequestUser,
    @Query('weekStart') weekStart?: string,
    @Query('weekEnd') weekEnd?: string,
    @Query('teacherId') teacherId?: string,
    @Query('className') className?: string,
  ) {
    return {
      data: await this.timetableService.list({
        weekStart,
        weekEnd,
        teacherId,
        className,
        actorRole: actor.role,
        actorUserId: actor.sub,
      }),
    };
  }

  @Post('slots')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create timetable slot' })
  @ApiBody({ type: CreateTimetableSlotDto })
  @ApiOkResponse({ type: TimetableSlotResponseDto })
  async createSlot(@Body() dto: CreateTimetableSlotDto) {
    return {
      data: await this.timetableService.create(dto),
    };
  }

  @Patch('slots/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update timetable slot' })
  @ApiBody({ type: UpdateTimetableSlotDto })
  @ApiOkResponse({ type: TimetableSlotResponseDto })
  async updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTimetableSlotDto,
  ) {
    return {
      data: await this.timetableService.update(id, dto),
    };
  }

  @Delete('slots/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete timetable slot' })
  @ApiOkResponse({ type: DeleteTimetableSlotResponseDto })
  async removeSlot(@Param('id') id: string) {
    return {
      data: await this.timetableService.remove(id),
    };
  }
}
