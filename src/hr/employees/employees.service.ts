import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Employee, Prisma } from '@prisma/client';
import { encrypt } from 'utils/help';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEmployeeDto,
  PaginatedEmployeesResponseDto,
  UpdateEmployeeDto,
} from './dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    try {
      // Check if fingerPrintId is unique if provided
      if (createEmployeeDto.fingerPrintId) {
        const existingEmployee = await this.prisma.employee.findUnique({
          where: { fingerPrintId: createEmployeeDto.fingerPrintId },
        });
        if (existingEmployee) {
          throw new BadRequestException('Fingerprint ID already exists');
        }
      }

      // Check if userId is unique if provided
      if (createEmployeeDto.userId) {
        const existingEmployee = await this.prisma.employee.findUnique({
          where: { userId: createEmployeeDto.userId },
        });
        if (existingEmployee) {
          throw new BadRequestException(
            'User ID already assigned to another employee',
          );
        }
      }
      const { encryptionKey, ...employeeData } = createEmployeeDto;

      // Only encrypt salary if both salary and encryption key are provided and salary is not empty
      if (employeeData.salary?.trim() && encryptionKey?.trim()) {
        employeeData.salary = encrypt(
          employeeData.salary.trim(),
          encryptionKey.trim(),
        );
      } else {
        // If no valid salary, remove it from the data
        delete employeeData.salary;
      }

      return await this.prisma.employee.create({
        data: {
          ...employeeData,
          dateOfBirth: employeeData.dateOfBirth
            ? new Date(employeeData.dateOfBirth)
            : undefined,
          hireDate: employeeData.hireDate
            ? new Date(employeeData.hireDate)
            : undefined,
          terminationDate: employeeData.terminationDate
            ? new Date(employeeData.terminationDate)
            : undefined,
          startWorkingTime: createEmployeeDto.startWorkingTime
            ? new Date(createEmployeeDto.startWorkingTime)
            : undefined,
          endWorkingTime: createEmployeeDto.endWorkingTime
            ? new Date(createEmployeeDto.endWorkingTime)
            : undefined,
        },
        include: {
          job: true,
          department: true,
          manager: true,
          subordinates: true,
          user: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create employee');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    jobId?: string,
    employmentStatus?: string,
    managerId?: string,
    departmentId?: string,
  ): Promise<PaginatedEmployeesResponseDto> {
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      isDeleted: false,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(jobId && { jobId }),
      ...(employmentStatus && { employmentStatus: employmentStatus as any }),
      ...(managerId && { managerId }),
      ...(departmentId && { departmentId }),
    };

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          job: true,
          department: true,
          manager: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      employees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findUnique({
      where: { id, isDeleted: false },
      include: {
        job: true,
        department: true,
        manager: true,
        subordinates: {
          include: {
            job: true,
            department: true,
          },
        },
        user: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        leaves: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            approvedBy: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    const employee = await this.findOne(id);

    // Check if fingerPrintId is unique if being updated
    // Only check uniqueness if fingerPrintId is provided and different from current value
    // Note: null is allowed (to clear the fingerprint ID)
    if (
      updateEmployeeDto.fingerPrintId !== undefined &&
      updateEmployeeDto.fingerPrintId !== null &&
      updateEmployeeDto.fingerPrintId !== employee.fingerPrintId
    ) {
      const existingEmployee = await this.prisma.employee.findUnique({
        where: { fingerPrintId: updateEmployeeDto.fingerPrintId },
      });
      if (existingEmployee) {
        throw new BadRequestException('Fingerprint ID already exists');
      }
    }

    // Check if userId is unique if being updated
    if (
      updateEmployeeDto.userId &&
      updateEmployeeDto.userId !== employee.userId
    ) {
      const existingEmployee = await this.prisma.employee.findUnique({
        where: { userId: updateEmployeeDto.userId },
      });
      if (existingEmployee) {
        throw new BadRequestException(
          'User ID already assigned to another employee',
        );
      }
    }

    try {
      const { encryptionKey, ...employeeData } = updateEmployeeDto;

      // Handle salary updates
      if ('salary' in updateEmployeeDto) {
        if (employeeData.salary === null) {
          // If salary is explicitly set to null, remove it
          employeeData.salary = null;
        } else if (employeeData.salary?.trim() && encryptionKey?.trim()) {
          // Only encrypt if both salary and key are provided and not empty
          employeeData.salary = encrypt(
            employeeData.salary.trim(),
            encryptionKey.trim(),
          );
        } else {
          // If salary is provided but invalid (empty string or no key), remove it from update
          delete employeeData.salary;
        }
      }

      return await this.prisma.employee.update({
        where: { id },
        data: {
          ...employeeData,
          // Explicitly handle fingerPrintId to allow null values (to clear fingerprint)
          ...(updateEmployeeDto.fingerPrintId !== undefined && {
            fingerPrintId: updateEmployeeDto.fingerPrintId,
          }),
          dateOfBirth: employeeData.dateOfBirth
            ? new Date(employeeData.dateOfBirth)
            : undefined,
          hireDate: employeeData.hireDate
            ? new Date(employeeData.hireDate)
            : undefined,
          terminationDate: employeeData.terminationDate
            ? new Date(employeeData.terminationDate)
            : undefined,
          startWorkingTime: updateEmployeeDto.startWorkingTime
            ? new Date(updateEmployeeDto.startWorkingTime)
            : undefined,
          endWorkingTime: updateEmployeeDto.endWorkingTime
            ? new Date(updateEmployeeDto.endWorkingTime)
            : undefined,
        },
        include: {
          job: true,
          department: true,
          manager: true,
          subordinates: true,
          user: true,
        },
      });
    } catch {
      throw new BadRequestException('Failed to update employee');
    }
  }

  async remove(id: string): Promise<Employee> {
    // const employee = await this.findOne(id);

    return await this.prisma.employee.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        job: true,
        manager: true,
        subordinates: true,
        user: true,
      },
    });
  }

  async getEmployeeStats() {
    const [total, active, inactive, onLeave] = await Promise.all([
      this.prisma.employee.count({ where: { isDeleted: false } }),
      this.prisma.employee.count({
        where: { isDeleted: false, employmentStatus: 'ACTIVE' },
      }),
      this.prisma.employee.count({
        where: { isDeleted: false, employmentStatus: 'INACTIVE' },
      }),
      this.prisma.employee.count({
        where: { isDeleted: false, employmentStatus: 'ON_LEAVE' },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      onLeave,
    };
  }

  async getEmployeesByJob() {
    return await this.prisma.job.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            employees: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });
  }
}
