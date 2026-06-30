import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisciplinaryAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDisciplinaryActionDto,
  GetDisciplinaryActionsDto,
  ResolveActionDto,
  UpdateDisciplinaryActionDto,
} from './dto';

@Injectable()
export class DisciplinaryActionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateDisciplinaryActionDto,
    issuedById: string,
  ): Promise<DisciplinaryAction> {
    try {
      // Verify employee exists
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId, isDeleted: false },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Create disciplinary action
      const action = await this.prisma.disciplinaryAction.create({
        data: {
          employeeId: createDto.employeeId,
          type: createDto.type,
          severity: createDto.severity,
          category: createDto.category,
          title: createDto.title,
          reason: createDto.reason,
          description: createDto.description,
          actionDate: new Date(createDto.actionDate),
          penalty: createDto.penalty,
          deductionAmount: createDto.deductionAmount,
          deductionDays: createDto.deductionDays,
          suspensionDays: createDto.suspensionDays,
          evidenceUrl: createDto.evidenceUrl,
          witnessNames: createDto.witnessNames,
          issuedById,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          issuedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return action;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create disciplinary action');
    }
  }

  async findAll(dto: GetDisciplinaryActionsDto) {
    const {
      employeeId,
      type,
      severity,
      category,
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'actionDate',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;

    const where: Prisma.DisciplinaryActionWhereInput = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (startDate && endDate) {
      where.actionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [actions, total] = await Promise.all([
      this.prisma.disciplinaryAction.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          issuedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.disciplinaryAction.count({ where }),
    ]);

    return {
      actions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<DisciplinaryAction> {
    const action = await this.prisma.disciplinaryAction.findUnique({
      where: { id, isDeleted: false },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            job: {
              select: {
                id: true,
                name: true,
              },
            },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException('Disciplinary action not found');
    }

    return action;
  }

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.disciplinaryAction.findMany({
      where: {
        employeeId,
        isDeleted: false,
      },
      include: {
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        actionDate: 'desc',
      },
    });
  }

  async update(
    id: string,
    updateDto: UpdateDisciplinaryActionDto,
  ): Promise<DisciplinaryAction> {
    // const action = await this.findOne(id);

    const updatedAction = await this.prisma.disciplinaryAction.update({
      where: { id },
      data: {
        type: updateDto.type,
        severity: updateDto.severity,
        category: updateDto.category,
        title: updateDto.title,
        reason: updateDto.reason,
        description: updateDto.description,
        actionDate: updateDto.actionDate
          ? new Date(updateDto.actionDate)
          : undefined,
        penalty: updateDto.penalty,
        deductionAmount: updateDto.deductionAmount,
        deductionDays: updateDto.deductionDays,
        suspensionDays: updateDto.suspensionDays,
        evidenceUrl: updateDto.evidenceUrl,
        witnessNames: updateDto.witnessNames,
        status: updateDto.status,
        resolvedDate: updateDto.resolvedDate
          ? new Date(updateDto.resolvedDate)
          : undefined,
        resolvedNotes: updateDto.resolvedNotes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedAction;
  }

  async resolve(
    id: string,
    resolveDto: ResolveActionDto,
  ): Promise<DisciplinaryAction> {
    const action = await this.findOne(id);

    if (action.status === 'RESOLVED' || action.status === 'CANCELLED') {
      throw new BadRequestException('Action is already resolved or cancelled');
    }

    const resolvedAction = await this.prisma.disciplinaryAction.update({
      where: { id },
      data: {
        status: resolveDto.status,
        resolvedDate: resolveDto.resolvedDate
          ? new Date(resolveDto.resolvedDate)
          : new Date(),
        resolvedNotes: resolveDto.resolvedNotes,
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
        issuedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return resolvedAction;
  }

  async remove(id: string): Promise<DisciplinaryAction> {
    // const action = await this.findOne(id);

    return await this.prisma.disciplinaryAction.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
        issuedBy: true,
      },
    });
  }

  async getEmployeeActionHistory(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [actions, stats] = await Promise.all([
      this.prisma.disciplinaryAction.findMany({
        where: {
          employeeId,
          isDeleted: false,
        },
        include: {
          issuedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          actionDate: 'desc',
        },
      }),
      this.getEmployeeActionStats(employeeId),
    ]);

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      actions,
      stats,
    };
  }

  async getEmployeeActionStats(employeeId: string) {
    const [
      total,
      active,
      resolved,
      byType,
      bySeverity,
      totalDeductions,
      totalSuspensionDays,
    ] = await Promise.all([
      // Total actions
      this.prisma.disciplinaryAction.count({
        where: { employeeId, isDeleted: false },
      }),
      // Active actions
      this.prisma.disciplinaryAction.count({
        where: { employeeId, isDeleted: false, status: 'ACTIVE' },
      }),
      // Resolved actions
      this.prisma.disciplinaryAction.count({
        where: { employeeId, isDeleted: false, status: 'RESOLVED' },
      }),
      // By type
      this.prisma.disciplinaryAction.groupBy({
        by: ['type'],
        where: { employeeId, isDeleted: false },
        _count: { type: true },
      }),
      // By severity
      this.prisma.disciplinaryAction.groupBy({
        by: ['severity'],
        where: { employeeId, isDeleted: false },
        _count: { severity: true },
      }),
      // Total deductions
      this.prisma.disciplinaryAction.aggregate({
        where: { employeeId, isDeleted: false, type: 'SALARY_DEDUCTION' },
        _sum: { deductionAmount: true },
      }),
      // Total suspension days
      this.prisma.disciplinaryAction.aggregate({
        where: { employeeId, isDeleted: false, type: 'SUSPENSION' },
        _sum: { suspensionDays: true },
      }),
    ]);

    return {
      total,
      active,
      resolved,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count.severity,
      })),
      totalDeductions: totalDeductions._sum.deductionAmount || 0,
      totalSuspensionDays: totalSuspensionDays._sum.suspensionDays || 0,
    };
  }

  async getStats() {
    const [
      totalActions,
      activeActions,
      resolvedActions,
      byType,
      bySeverity,
      byCategory,
      recentActions,
    ] = await Promise.all([
      this.prisma.disciplinaryAction.count({
        where: { isDeleted: false },
      }),
      this.prisma.disciplinaryAction.count({
        where: { isDeleted: false, status: 'ACTIVE' },
      }),
      this.prisma.disciplinaryAction.count({
        where: { isDeleted: false, status: 'RESOLVED' },
      }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['type'],
        where: { isDeleted: false },
        _count: { type: true },
      }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['severity'],
        where: { isDeleted: false },
        _count: { severity: true },
      }),
      this.prisma.disciplinaryAction.groupBy({
        by: ['category'],
        where: { isDeleted: false },
        _count: { category: true },
      }),
      this.prisma.disciplinaryAction.findMany({
        where: { isDeleted: false },
        take: 10,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: true,
            },
          },
          issuedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { actionDate: 'desc' },
      }),
    ]);

    return {
      totalActions,
      activeActions,
      resolvedActions,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count.severity,
      })),
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count.category,
      })),
      recentActions,
    };
  }

  async getCriticalActions() {
    return this.prisma.disciplinaryAction.findMany({
      where: {
        isDeleted: false,
        severity: 'CRITICAL',
        status: 'ACTIVE',
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
        issuedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        actionDate: 'desc',
      },
    });
  }

  async getEmployeesWithMultipleWarnings(minWarnings: number = 3) {
    const employees = await this.prisma.employee.findMany({
      where: {
        isDeleted: false,
        disciplinaryActions: {
          some: {
            isDeleted: false,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        disciplinaryActions: {
          where: {
            isDeleted: false,
            status: 'ACTIVE',
          },
        },
        job: true,
      },
    });

    // Filter employees with multiple warnings
    const employeesWithWarnings = employees
      .map((employee) => ({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        job: employee.job,
        warningCount: employee.disciplinaryActions.length,
        actions: employee.disciplinaryActions,
      }))
      .filter((emp) => emp.warningCount >= minWarnings)
      .sort((a, b) => b.warningCount - a.warningCount);

    return employeesWithWarnings;
  }
}
