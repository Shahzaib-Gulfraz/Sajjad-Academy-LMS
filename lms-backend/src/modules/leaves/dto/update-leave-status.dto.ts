import { IsEnum } from 'class-validator';

export class UpdateLeaveStatusDto {
  @IsEnum(['Approved', 'Rejected'])
  status!: 'Approved' | 'Rejected';
}
