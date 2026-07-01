import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Department } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService, private tenantPrisma: TenantPrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    try {
      // Check if parent department exists if parentId is provided
      if (createDepartmentDto.parentId) {
        const parentDepartment = await this.tenantPrisma.client.department.findUnique({
          where: { id: createDepartmentDto.parentId, isDeleted: false },
        });
        if (!parentDepartment) {
          throw new BadRequestException('Parent department not found');
        }
      }

      return await this.tenantPrisma.client.department.create({
        data: createDepartmentDto,
        include: {
          parent: true,
          children: true,
          employees: {
            where: { isDeleted: false },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create department');
    }
  }

  async findAll(): Promise<Department[]> {
    return await this.tenantPrisma.client.department.findMany({
      where: { isDeleted: false },
      include: {
        parent: true,
        children: {
          where: { isDeleted: false },
        },
        employees: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.tenantPrisma.client.department.findUnique({
      where: { id, isDeleted: false },
      include: {
        parent: true,
        children: {
          where: { isDeleted: false },
        },
        employees: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    try {
      // Check if department exists
      const existingDepartment = await this.tenantPrisma.client.department.findUnique({
        where: { id, isDeleted: false },
      });

      if (!existingDepartment) {
        throw new NotFoundException('Department not found');
      }

      // Check if parent department exists if parentId is provided
      if (updateDepartmentDto.parentId) {
        if (updateDepartmentDto.parentId === id) {
          throw new BadRequestException('Department cannot be its own parent');
        }

        const parentDepartment = await this.tenantPrisma.client.department.findUnique({
          where: { id: updateDepartmentDto.parentId, isDeleted: false },
        });
        if (!parentDepartment) {
          throw new BadRequestException('Parent department not found');
        }

        // Check for circular reference
        await this.checkCircularReference(id, updateDepartmentDto.parentId);
      }

      return await this.tenantPrisma.client.department.update({
        where: { id },
        data: updateDepartmentDto,
        include: {
          parent: true,
          children: {
            where: { isDeleted: false },
          },
          employees: {
            where: { isDeleted: false },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              job: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update department');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Check if department exists
      const department = await this.tenantPrisma.client.department.findUnique({
        where: { id, isDeleted: false },
        include: {
          children: { where: { isDeleted: false } },
          employees: { where: { isDeleted: false } },
        },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      // Check if department has children
      if (department.children.length > 0) {
        throw new BadRequestException(
          'Cannot delete department with child departments',
        );
      }

      // Check if department has employees
      if (department.employees.length > 0) {
        throw new BadRequestException(
          'Cannot delete department with employees',
        );
      }

      // Soft delete
      await this.tenantPrisma.client.department.update({
        where: { id },
        data: { isDeleted: true },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete department');
    }
  }

  async getHierarchy(): Promise<Department[]> {
    const departments = await this.tenantPrisma.client.department.findMany({
      where: { isDeleted: false },
      include: {
        parent: true,
        children: {
          where: { isDeleted: false },
        },
        employees: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            job: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build hierarchy tree
    return this.buildHierarchyTree(departments);
  }

  private async checkCircularReference(
    departmentId: string,
    parentId: string,
  ): Promise<void> {
    let currentParentId = parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BadRequestException('Circular reference detected');
      }

      if (currentParentId === departmentId) {
        throw new BadRequestException('Circular reference detected');
      }

      visited.add(currentParentId);

      const parent = await this.tenantPrisma.client.department.findUnique({
        where: { id: currentParentId, isDeleted: false },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId || null;
    }
  }

  private buildHierarchyTree(departments: Department[]): Department[] {
    const departmentMap = new Map<
      string,
      Department & { children: Department[] }
    >();
    const rootDepartments: Department[] = [];

    // Create a map of all departments
    departments.forEach((dept) => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // Build the tree
    departments.forEach((dept) => {
      if (dept.parentId) {
        const parent = departmentMap.get(dept.parentId);
        if (parent) {
          parent.children.push(departmentMap.get(dept.id)!);
        }
      } else {
        rootDepartments.push(departmentMap.get(dept.id)!);
      }
    });

    return rootDepartments;
  }
}
