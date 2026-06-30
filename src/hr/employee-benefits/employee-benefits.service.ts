import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeBenefit, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEmployeeBenefitDto,
  GetEmployeeBenefitsDto,
  UpdateEmployeeBenefitDto,
} from './dto';

@Injectable()
export class EmployeeBenefitsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateEmployeeBenefitDto): Promise<EmployeeBenefit> {
    try {
      // Verify employee exists
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId, isDeleted: false },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const benefit = await this.prisma.employeeBenefit.create({
        data: {
          employeeId: createDto.employeeId,
          type: createDto.type,
          name: createDto.name,
          description: createDto.description,
          provider: createDto.provider,
          policyNumber: createDto.policyNumber,
          startDate: new Date(createDto.startDate),
          endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
          coverage: createDto.coverage,
          premium: createDto.premium,
          amount: createDto.amount,
          frequency: createDto.frequency,
          isActive:
            createDto.isActive !== undefined ? createDto.isActive : true,
          notes: createDto.notes,
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
        },
      });

      return benefit;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create employee benefit');
    }
  }

  async findAll(dto: GetEmployeeBenefitsDto) {
    const {
      employeeId,
      type,
      isActive,
      search,
      page = 1,
      limit = 20,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeBenefitWhereInput = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [benefits, total] = await Promise.all([
      this.prisma.employeeBenefit.findMany({
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
        },
        orderBy,
      }),
      this.prisma.employeeBenefit.count({ where }),
    ]);

    return {
      benefits,
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

  async findOne(id: string): Promise<EmployeeBenefit> {
    const benefit = await this.prisma.employeeBenefit.findUnique({
      where: { id, isDeleted: false },
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
    });

    if (!benefit) {
      throw new NotFoundException('Benefit not found');
    }

    return benefit;
  }

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employeeBenefit.findMany({
      where: {
        employeeId,
        isDeleted: false,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async update(
    id: string,
    updateDto: UpdateEmployeeBenefitDto,
  ): Promise<EmployeeBenefit> {
    // const benefit = await this.findOne(id);

    const updatedBenefit = await this.prisma.employeeBenefit.update({
      where: { id },
      data: {
        type: updateDto.type,
        name: updateDto.name,
        description: updateDto.description,
        provider: updateDto.provider,
        policyNumber: updateDto.policyNumber,
        startDate: updateDto.startDate
          ? new Date(updateDto.startDate)
          : undefined,
        endDate: updateDto.endDate ? new Date(updateDto.endDate) : undefined,
        coverage: updateDto.coverage,
        premium: updateDto.premium,
        amount: updateDto.amount,
        frequency: updateDto.frequency,
        isActive: updateDto.isActive,
        notes: updateDto.notes,
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
    });

    return updatedBenefit;
  }

  async remove(id: string): Promise<EmployeeBenefit> {
    // const benefit = await this.findOne(id);

    return await this.prisma.employeeBenefit.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
      },
    });
  }

  async deactivate(id: string): Promise<EmployeeBenefit> {
    // const benefit = await this.findOne(id);

    return await this.prisma.employeeBenefit.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
      include: {
        employee: true,
      },
    });
  }

  async getStats(employeeId?: string) {
    const where: Prisma.EmployeeBenefitWhereInput = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const [
      total,
      active,
      inactive,
      byType,
      totalPremiums,
      totalAllowances,
      expiringInWeek,
    ] = await Promise.all([
      this.prisma.employeeBenefit.count({ where }),
      this.prisma.employeeBenefit.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.employeeBenefit.count({
        where: { ...where, isActive: false },
      }),
      this.prisma.employeeBenefit.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      this.prisma.employeeBenefit.aggregate({
        where: { ...where, premium: { not: null } },
        _sum: { premium: true },
      }),
      this.prisma.employeeBenefit.aggregate({
        where: {
          ...where,
          type: {
            in: [
              'TRANSPORTATION',
              'HOUSING',
              'MEAL_VOUCHER',
              'PHONE_ALLOWANCE',
              'ALLOWANCE',
            ],
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.employeeBenefit.count({
        where: {
          ...where,
          isActive: true,
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      totalPremiums: totalPremiums._sum.premium || 0,
      totalAllowances: totalAllowances._sum.amount || 0,
      expiringInWeek,
    };
  }

  async getExpiring(daysBeforeExpiry: number = 30) {
    const futureDate = new Date(
      Date.now() + daysBeforeExpiry * 24 * 60 * 60 * 1000,
    );

    return this.prisma.employeeBenefit.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        endDate: {
          gte: new Date(),
          lte: futureDate,
        },
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
        endDate: 'asc',
      },
    });
  }
}
