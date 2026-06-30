import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRequest, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEmployeeRequestDto,
  GetEmployeeRequestsDto,
  ReviewRequestDto,
  UpdateEmployeeRequestDto,
} from './dto';

@Injectable()
export class EmployeeRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateEmployeeRequestDto): Promise<EmployeeRequest> {
    try {
      // Verify employee exists
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId, isDeleted: false },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // Create request
      const request = await this.prisma.employeeRequest.create({
        data: {
          employeeId: createDto.employeeId,
          type: createDto.type,
          priority: createDto.priority || 'MEDIUM',
          title: createDto.title,
          description: createDto.description,
          attachments: createDto.attachments || [],
          requestedAmount: createDto.requestedAmount,
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

      return request;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create employee request');
    }
  }

  async findAll(dto: GetEmployeeRequestsDto) {
    const {
      employeeId,
      type,
      priority,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeRequestWhereInput = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [requests, total] = await Promise.all([
      this.prisma.employeeRequest.findMany({
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
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.employeeRequest.count({ where }),
    ]);

    return {
      requests,
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

  async findOne(id: string): Promise<EmployeeRequest> {
    const request = await this.prisma.employeeRequest.findUnique({
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
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Employee request not found');
    }

    return request;
  }

  async findByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.prisma.employeeRequest.findMany({
      where: {
        employeeId,
        isDeleted: false,
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(
    id: string,
    updateDto: UpdateEmployeeRequestDto,
  ): Promise<EmployeeRequest> {
    // const request = await this.findOne(id);

    const updatedRequest = await this.prisma.employeeRequest.update({
      where: { id },
      data: {
        type: updateDto.type,
        priority: updateDto.priority,
        title: updateDto.title,
        description: updateDto.description,
        attachments: updateDto.attachments,
        requestedAmount: updateDto.requestedAmount,
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
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedRequest;
  }

  async review(
    id: string,
    reviewDto: ReviewRequestDto,
    reviewedById: string,
  ): Promise<EmployeeRequest> {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request has already been reviewed');
    }

    const reviewedRequest = await this.prisma.employeeRequest.update({
      where: { id },
      data: {
        status: reviewDto.status,
        reviewedById,
        reviewNotes: reviewDto.reviewNotes,
        reviewedAt: new Date(),
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
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return reviewedRequest;
  }

  async cancel(id: string, employeeId: string): Promise<EmployeeRequest> {
    const request = await this.findOne(id);

    // Only the employee who created the request can cancel it
    if (request.employeeId !== employeeId) {
      throw new BadRequestException('Only the request creator can cancel it');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    return await this.prisma.employeeRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        employee: true,
        reviewedBy: true,
      },
    });
  }

  async remove(id: string): Promise<EmployeeRequest> {
    // const request = await this.findOne(id);

    return await this.prisma.employeeRequest.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employee: true,
        reviewedBy: true,
      },
    });
  }

  async getStats(employeeId?: string) {
    const where: Prisma.EmployeeRequestWhereInput = {
      isDeleted: false,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const [
      total,
      pending,
      approved,
      rejected,
      byType,
      byPriority,
      totalRequestedAmount,
    ] = await Promise.all([
      this.prisma.employeeRequest.count({ where }),
      this.prisma.employeeRequest.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.employeeRequest.count({
        where: { ...where, status: 'APPROVED' },
      }),
      this.prisma.employeeRequest.count({
        where: { ...where, status: 'REJECTED' },
      }),
      this.prisma.employeeRequest.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      this.prisma.employeeRequest.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true },
      }),
      this.prisma.employeeRequest.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { requestedAmount: true },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      byPriority: byPriority.map((item) => ({
        priority: item.priority,
        count: item._count.priority,
      })),
      totalRequestedAmount: totalRequestedAmount._sum.requestedAmount || 0,
    };
  }

  async getPendingRequests() {
    return this.prisma.employeeRequest.findMany({
      where: {
        isDeleted: false,
        status: 'PENDING',
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
      orderBy: [
        { priority: 'desc' }, // Urgent first
        { createdAt: 'asc' }, // Oldest first
      ],
    });
  }

  async getUrgentRequests() {
    return this.prisma.employeeRequest.findMany({
      where: {
        isDeleted: false,
        status: 'PENDING',
        priority: 'URGENT',
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
        createdAt: 'asc',
      },
    });
  }
}
