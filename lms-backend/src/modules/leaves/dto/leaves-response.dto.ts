import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/auth/roles.enum';

export class LeaveRequestItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requesterUserId!: string;

  @ApiProperty({ required: false })
  requesterName?: string;

  @ApiProperty({ enum: UserRole })
  requesterRole!: UserRole;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  fromDate!: string;

  @ApiProperty()
  toDate!: string;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ enum: ['Pending', 'Approved', 'Rejected'] })
  status!: 'Pending' | 'Approved' | 'Rejected';

  @ApiProperty({ required: false })
  reviewedBy?: string;
}

export class LeaveRequestResponseDto {
  @ApiProperty({ type: LeaveRequestItemDto })
  data!: LeaveRequestItemDto;
}

export class LeaveRequestsListResponseDto {
  @ApiProperty({ type: [LeaveRequestItemDto] })
  data!: LeaveRequestItemDto[];
}
