import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from './schemas/leave-request.schema';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { UserRole } from '../../common/auth/roles.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class LeavesService {
  constructor(
    @InjectModel(LeaveRequest.name)
    private readonly leaveModel: Model<LeaveRequestDocument>,
    private readonly usersService: UsersService,
  ) {}

  async createLeave(
    dto: CreateLeaveRequestDto,
    actor: { sub: string; role: UserRole },
  ) {
    const leave = await this.leaveModel.create({
      requesterUserId: actor.sub,
      requesterRole: actor.role,
      type: dto.type,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      reason: dto.reason,
      status: 'Pending',
    });

    const requesterName = await this.resolveUserName(leave.requesterUserId);
    return this.toResponse(leave, requesterName);
  }

  async listLeaves(query: {
    status?: string;
    requesterRole?: UserRole;
    requesterUserId?: string;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.requesterRole) filter.requesterRole = query.requesterRole;
    if (query.requesterUserId) filter.requesterUserId = query.requesterUserId;

    const leaves = await this.leaveModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    const nameCache = new Map<string, string | undefined>();
    return Promise.all(
      leaves.map(async (leave) => {
        let requesterName = nameCache.get(leave.requesterUserId);
        if (
          requesterName === undefined &&
          !nameCache.has(leave.requesterUserId)
        ) {
          requesterName = await this.resolveUserName(leave.requesterUserId);
          nameCache.set(leave.requesterUserId, requesterName);
        }

        return this.toResponse(leave, requesterName);
      }),
    );
  }

  async updateStatus(
    leaveId: string,
    dto: UpdateLeaveStatusDto,
    reviewerId: string,
  ) {
    const leave = await this.leaveModel.findById(leaveId).exec();
    if (!leave) {
      throw new NotFoundException('Leave request not found.');
    }

    leave.status = dto.status;
    leave.reviewedBy = reviewerId;
    await leave.save();

    const requesterName = await this.resolveUserName(leave.requesterUserId);
    return this.toResponse(leave, requesterName);
  }

  private async resolveUserName(userId: string): Promise<string | undefined> {
    try {
      const user = await this.usersService.findById(userId);
      return user.name;
    } catch {
      return undefined;
    }
  }

  private toResponse(leave: LeaveRequestDocument, requesterName?: string) {
    return {
      id: leave.id,
      requesterUserId: leave.requesterUserId,
      requesterName,
      requesterRole: leave.requesterRole,
      type: leave.type,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      reason: leave.reason,
      status: leave.status,
      reviewedBy: leave.reviewedBy,
    };
  }
}
