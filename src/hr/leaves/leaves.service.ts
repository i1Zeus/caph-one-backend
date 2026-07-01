import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Leave, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApproveLeaveDto, CreateLeaveDto, UpdateLeaveDto } from './dto';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createLeaveDto: CreateLeaveDto): Promise<Leave> {
    try {
      const startDate = new Date(createLeaveDto.startDate);
      const endDate = new Date(createLeaveDto.endDate);

      if (startDate > endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping leaves
      const overlappingLeave = await this.tenantPrisma.client.leave.findFirst({
        where: {
          employeeId: createLeaveDto.employeeId,
          isDeleted: false,
          status: { not: 'REJECTED' },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      });

      if (overlappingLeave) {
        throw new BadRequestException(
          'Leave request overlaps with existing leave',
        );
      }

      return await this.tenantPrisma.client.leave.create({
        data: {
          ...createLeaveDto,
          startDate,
          endDate,
          status: createLeaveDto.status || 'PENDING',
        },
        include: {
          employee: true,
          approvedBy: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create leave request');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    employeeId?: string,
    status?: string,
    leaveType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveWhereInput = {
      isDeleted: false,
      ...(employeeId && { employeeId }),
      ...(status && { status: status as any }),
      ...(leaveType && { leaveType: leaveType as any }),
      ...(startDate &&
        endDate && {
          OR: [
            {
              startDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
            {
              endDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          ],
        }),
    };

    const [leaves, total] = await Promise.all([
      this.tenantPrisma.client.leave.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          approvedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.leave.count({ where }),
    ]);

    return {
      leaves,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Leave> {
    const leave = await this.tenantPrisma.client.leave.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: true,
        approvedBy: true,
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    return leave;
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto): Promise<Leave> {
    await this.findOne(id);

    try {
      return await this.tenantPrisma.client.leave.update({
        where: { id },
        data: {
          ...updateLeaveDto,
          startDate: updateLeaveDto.startDate
            ? new Date(updateLeaveDto.startDate)
            : undefined,
          endDate: updateLeaveDto.endDate
            ? new Date(updateLeaveDto.endDate)
            : undefined,
        },
        include: {
          employee: true,
          approvedBy: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to update leave request');
    }
  }

  async approve(id: string, approveLeaveDto: ApproveLeaveDto): Promise<Leave> {
    const leave = await this.findOne(id);

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Leave request is not pending');
    }

    return await this.tenantPrisma.client.leave.update({
      where: { id },
      data: {
        status: approveLeaveDto.status,
        approvedById: approveLeaveDto.approvedById,
      },
      include: {
        employee: true,
        approvedBy: true,
      },
    });
  }

  async remove(id: string): Promise<Leave> {
    await this.findOne(id);

    return await this.tenantPrisma.client.leave.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
        approvedBy: true,
      },
    });
  }

  async getLeaveStats() {
    const [pending, approved, rejected] = await Promise.all([
      this.tenantPrisma.client.leave.count({
        where: { isDeleted: false, status: 'PENDING' },
      }),
      this.tenantPrisma.client.leave.count({
        where: { isDeleted: false, status: 'APPROVED' },
      }),
      this.tenantPrisma.client.leave.count({
        where: { isDeleted: false, status: 'REJECTED' },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
    };
  }

  async getEmployeeLeaveBalance(employeeId: string) {
    const employee = await this.tenantPrisma.client.employee.findUnique({
      where: { id: employeeId },
      select: { leavesAllowed: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedLeaves = await this.tenantPrisma.client.leave.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        isDeleted: false,
        startDate: { gte: yearStart },
        endDate: { lte: yearEnd },
      },
    });

    const usedLeaveDays = approvedLeaves.reduce((total, leave) => {
      const diffTime = Math.abs(
        leave.endDate.getTime() - leave.startDate.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return total + diffDays;
    }, 0);

    return {
      allowedLeaves: employee.leavesAllowed || 21,
      usedLeaves: usedLeaveDays,
      remainingLeaves: (employee.leavesAllowed || 21) - usedLeaveDays,
    };
  }
}
