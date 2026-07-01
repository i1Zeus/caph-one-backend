import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Job, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    try {
      // Check if job name already exists
      const existingJob = await this.tenantPrisma.client.job.findFirst({
        where: {
          name: createJobDto.name,
          isDeleted: false,
        },
      });

      if (existingJob) {
        throw new BadRequestException('Job with this name already exists');
      }

      return await this.tenantPrisma.client.job.create({
        data: createJobDto,
        include: {
          employees: {
            where: { isDeleted: false },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employmentStatus: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create job');
    }
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [jobs, total] = await Promise.all([
      this.tenantPrisma.client.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          employees: {
            where: { isDeleted: false },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employmentStatus: true,
            },
          },
          _count: {
            select: {
              employees: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.tenantPrisma.client.job.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.tenantPrisma.client.job.findUnique({
      where: { id, isDeleted: false },
      include: {
        employees: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            employees: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);

    // Check if job name already exists (excluding current job)
    if (updateJobDto.name && updateJobDto.name !== job.name) {
      const existingJob = await this.tenantPrisma.client.job.findFirst({
        where: {
          name: updateJobDto.name,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingJob) {
        throw new BadRequestException('Job with this name already exists');
      }
    }

    try {
      return await this.tenantPrisma.client.job.update({
        where: { id },
        data: updateJobDto,
        include: {
          employees: {
            where: { isDeleted: false },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employmentStatus: true,
            },
          },
        },
      });
    } catch {
      throw new BadRequestException('Failed to update job');
    }
  }

  async remove(id: string): Promise<Job> {
    // const job = await this.findOne(id);

    // Check if job has active employees
    const activeEmployeesCount = await this.tenantPrisma.client.employee.count({
      where: {
        jobId: id,
        isDeleted: false,
        employmentStatus: 'ACTIVE',
      },
    });

    if (activeEmployeesCount > 0) {
      throw new BadRequestException(
        'Cannot delete job with active employees. Please reassign employees first.',
      );
    }

    return await this.tenantPrisma.client.job.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        employees: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employmentStatus: true,
          },
        },
      },
    });
  }

  async getJobStats() {
    const [totalJobs, jobsWithEmployees] = await Promise.all([
      this.tenantPrisma.client.job.count({ where: { isDeleted: false } }),
      this.tenantPrisma.client.job.count({
        where: {
          isDeleted: false,
          employees: {
            some: {
              isDeleted: false,
            },
          },
        },
      }),
    ]);

    return {
      totalJobs,
      jobsWithEmployees,
      emptyJobs: totalJobs - jobsWithEmployees,
    };
  }
}
