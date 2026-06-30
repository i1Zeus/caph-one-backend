import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeExit } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeExitDto, UpdateEmployeeExitDto } from './dto';

@Injectable()
export class EmployeeExitService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateEmployeeExitDto,
    processedById: string,
  ): Promise<EmployeeExit> {
    try {
      // Verify employee exists and doesn't have an exit record
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId, isDeleted: false },
        include: { exit: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (employee.exit && !employee.exit.isDeleted) {
        throw new BadRequestException('Employee already has an exit record');
      }

      // Create exit record
      const exit = await this.prisma.employeeExit.create({
        data: {
          employeeId: createDto.employeeId,
          exitType: createDto.exitType,
          exitDate: new Date(createDto.exitDate),
          lastWorkingDay: new Date(createDto.lastWorkingDay),
          reason: createDto.reason,
          detailedReason: createDto.detailedReason,
          rehireEligible:
            createDto.rehireEligible !== undefined
              ? createDto.rehireEligible
              : true,
          finalSettlement: createDto.finalSettlement,
          settlementNotes: createDto.settlementNotes,
          processedBy: processedById,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: true,
              hireDate: true,
            },
          },
          processedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update employee status to TERMINATED
      await this.prisma.employee.update({
        where: { id: createDto.employeeId },
        data: {
          employmentStatus: 'TERMINATED',
          terminationDate: new Date(createDto.exitDate),
        },
      });

      return exit;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create exit record');
    }
  }

  async findAll() {
    return this.prisma.employeeExit.findMany({
      where: { isDeleted: false },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
            hireDate: true,
          },
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        exitDate: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<EmployeeExit> {
    const exit = await this.prisma.employeeExit.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            job: true,
            hireDate: true,
            salary: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!exit) {
      throw new NotFoundException('Exit record not found');
    }

    return exit;
  }

  async findByEmployee(employeeId: string): Promise<EmployeeExit | null> {
    return this.prisma.employeeExit.findUnique({
      where: { employeeId, isDeleted: false },
      include: {
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    updateDto: UpdateEmployeeExitDto,
  ): Promise<EmployeeExit> {
    // const exit = await this.findOne(id);

    const updatedExit = await this.prisma.employeeExit.update({
      where: { id },
      data: {
        exitType: updateDto.exitType,
        exitDate: updateDto.exitDate ? new Date(updateDto.exitDate) : undefined,
        lastWorkingDay: updateDto.lastWorkingDay
          ? new Date(updateDto.lastWorkingDay)
          : undefined,
        reason: updateDto.reason,
        detailedReason: updateDto.detailedReason,
        exitInterviewDone: updateDto.exitInterviewDone,
        exitInterviewDate: updateDto.exitInterviewDate
          ? new Date(updateDto.exitInterviewDate)
          : undefined,
        feedback: updateDto.feedback,
        rehireEligible: updateDto.rehireEligible,
        assetReturned: updateDto.assetReturned,
        documentsSigned: updateDto.documentsSigned,
        accessRevoked: updateDto.accessRevoked,
        exitInterviewCompleted: updateDto.exitInterviewCompleted,
        handoverCompleted: updateDto.handoverCompleted,
        finalSettlement: updateDto.finalSettlement,
        settlementPaid: updateDto.settlementPaid,
        settlementDate: updateDto.settlementDate
          ? new Date(updateDto.settlementDate)
          : undefined,
        settlementNotes: updateDto.settlementNotes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
        processedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedExit;
  }

  async updateClearanceChecklist(
    id: string,
    checklist: {
      assetReturned?: boolean;
      documentsSigned?: boolean;
      accessRevoked?: boolean;
      exitInterviewCompleted?: boolean;
      handoverCompleted?: boolean;
    },
  ): Promise<EmployeeExit> {
    // const exit = await this.findOne(id);

    return await this.prisma.employeeExit.update({
      where: { id },
      data: checklist,
      include: {
        employee: true,
        processedByUser: true,
      },
    });
  }

  async updateFinancialSettlement(
    id: string,
    settlement: {
      finalSettlement?: number;
      settlementPaid?: boolean;
      settlementDate?: string;
      settlementNotes?: string;
    },
  ): Promise<EmployeeExit> {
    // const exit = await this.findOne(id);

    return await this.prisma.employeeExit.update({
      where: { id },
      data: {
        finalSettlement: settlement.finalSettlement,
        settlementPaid: settlement.settlementPaid,
        settlementDate: settlement.settlementDate
          ? new Date(settlement.settlementDate)
          : undefined,
        settlementNotes: settlement.settlementNotes,
      },
      include: {
        employee: true,
        processedByUser: true,
      },
    });
  }

  async recordExitInterview(
    id: string,
    interview: {
      exitInterviewDone: boolean;
      exitInterviewDate?: string;
      feedback?: string;
      rehireEligible?: boolean;
    },
  ): Promise<EmployeeExit> {
    // const exit = await this.findOne(id);

    return await this.prisma.employeeExit.update({
      where: { id },
      data: {
        exitInterviewDone: interview.exitInterviewDone,
        exitInterviewDate: interview.exitInterviewDate
          ? new Date(interview.exitInterviewDate)
          : undefined,
        feedback: interview.feedback,
        rehireEligible: interview.rehireEligible,
        exitInterviewCompleted: interview.exitInterviewDone,
      },
      include: {
        employee: true,
        processedByUser: true,
      },
    });
  }

  async remove(id: string): Promise<EmployeeExit> {
    const exit = await this.findOne(id);

    // Restore employee status to ACTIVE
    await this.prisma.employee.update({
      where: { id: exit.employeeId },
      data: {
        employmentStatus: 'ACTIVE',
        terminationDate: null,
      },
    });

    return await this.prisma.employeeExit.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getStats() {
    const [
      total,
      thisMonth,
      thisYear,
      byExitType,
      pendingClearance,
      pendingSettlement,
      avgServiceYears,
    ] = await Promise.all([
      // Total exits
      this.prisma.employeeExit.count({
        where: { isDeleted: false },
      }),
      // This month
      this.prisma.employeeExit.count({
        where: {
          isDeleted: false,
          exitDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // This year
      this.prisma.employeeExit.count({
        where: {
          isDeleted: false,
          exitDate: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      }),
      // By exit type
      this.prisma.employeeExit.groupBy({
        by: ['exitType'],
        where: { isDeleted: false },
        _count: { exitType: true },
      }),
      // Pending clearance
      this.prisma.employeeExit.count({
        where: {
          isDeleted: false,
          OR: [
            { assetReturned: false },
            { documentsSigned: false },
            { accessRevoked: false },
            { exitInterviewCompleted: false },
            { handoverCompleted: false },
          ],
        },
      }),
      // Pending settlement
      this.prisma.employeeExit.count({
        where: {
          isDeleted: false,
          settlementPaid: false,
          finalSettlement: { not: null },
        },
      }),
      // Calculate average service years
      this.prisma.employeeExit.findMany({
        where: { isDeleted: false },
        select: {
          exitDate: true,
          employee: {
            select: {
              hireDate: true,
            },
          },
        },
      }),
    ]);

    // Calculate average service years
    let totalServiceYears = 0;
    let validCount = 0;

    for (const exit of avgServiceYears) {
      if (exit.employee.hireDate) {
        const years =
          (new Date(exit.exitDate).getTime() -
            new Date(exit.employee.hireDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365);
        totalServiceYears += years;
        validCount++;
      }
    }

    const averageServiceYears =
      validCount > 0 ? totalServiceYears / validCount : 0;

    return {
      total,
      thisMonth,
      thisYear,
      byExitType: byExitType.map((item) => ({
        exitType: item.exitType,
        count: item._count.exitType,
      })),
      pendingClearance,
      pendingSettlement,
      averageServiceYears: parseFloat(averageServiceYears.toFixed(2)),
    };
  }

  async getClearancePending() {
    return this.prisma.employeeExit.findMany({
      where: {
        isDeleted: false,
        OR: [
          { assetReturned: false },
          { documentsSigned: false },
          { accessRevoked: false },
          { exitInterviewCompleted: false },
          { handoverCompleted: false },
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
      },
      orderBy: {
        exitDate: 'asc',
      },
    });
  }

  async getSettlementPending() {
    return this.prisma.employeeExit.findMany({
      where: {
        isDeleted: false,
        settlementPaid: false,
        finalSettlement: { not: null },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
      },
      orderBy: {
        exitDate: 'asc',
      },
    });
  }
}
