import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class AdminOrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    // Check if slug is unique
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        'An organization with this slug already exists.',
      );
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        logo: dto.logo,
        maxWorkspaces: dto.maxWorkspaces,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: { where: { isDeleted: false } },
              workspaces: { where: { isDeleted: false } },
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: { where: { isDeleted: false } },
            workspaces: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!org || org.isDeleted) {
      throw new NotFoundException('Organization not found.');
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.findOne(id);

    if (dto.slug && dto.slug !== org.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(
          'An organization with this slug already exists.',
        );
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft delete: set isActive to false and isDeleted to true
    return this.prisma.organization.update({
      where: { id },
      data: {
        isActive: false,
        isDeleted: true,
      },
    });
  }

  async restore(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }
    return this.prisma.organization.update({
      where: { id },
      data: {
        isActive: true,
        isDeleted: false,
      },
    });
  }

  async getOrgUsers(orgId: string) {
    await this.findOne(orgId);
    return this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        isSuperAdmin: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async getAllUsers(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          img: true,
          isSuperAdmin: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found.');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
