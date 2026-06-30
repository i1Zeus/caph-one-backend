import { LeaveStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class ApproveLeaveDto {
  @IsEnum(LeaveStatus)
  status: LeaveStatus;

  @IsString()
  approvedById: string;
}
