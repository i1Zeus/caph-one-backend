import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubscriptionTier, UserRoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // ORGANIZATION MANAGEMENT
  // =========================================================================

  async findAllOrganizations(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    isActive?: boolean,
    sortBy: 'name' | 'createdAt' | 'isActive' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              users: { where: { isDeleted: false } },
              salesInvoices: { where: { isDeleted: false } },
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

  async createOrganization(dto: CreateOrganizationDto) {
    let subdomain = dto.subdomain;
    if (!subdomain) {
      subdomain = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Ensure unique subdomain
    const existing = await this.prisma.organization.findUnique({
      where: { subdomain },
    });
    if (existing) {
      throw new ConflictException(
        `Organization with subdomain "${subdomain}" already exists.`,
      );
    }

    // Auto-generate a slug for compatibility if required
    const slug = subdomain;

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        subdomain,
        subscriptionTier: dto.subscriptionTier || SubscriptionTier.FREE,
        maxUsers: dto.maxUsers !== undefined ? dto.maxUsers : 10,
        isActive: true,
      },
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!org || org.isDeleted) {
      throw new NotFoundException('Organization not found.');
    }

    if (dto.subdomain && dto.subdomain !== org.subdomain) {
      const existing = await this.prisma.organization.findUnique({
        where: { subdomain: dto.subdomain },
      });
      if (existing) {
        throw new ConflictException(
          `Organization with subdomain "${dto.subdomain}" already exists.`,
        );
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        subdomain: dto.subdomain,
        slug: dto.subdomain || undefined, // Maintain sync between subdomain and slug
        subscriptionTier: dto.subscriptionTier,
        maxUsers: dto.maxUsers,
        isActive: dto.isActive,
      },
    });
  }

  async deleteOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!org || org.isDeleted) {
      throw new NotFoundException('Organization not found.');
    }

    // Soft delete organization and deactivate all users within it
    await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      this.prisma.user.updateMany({
        where: { organizationId: id },
        data: {
          isActive: false,
        },
      }),
    ]);

    return { message: 'Organization and its users successfully deactivated.' };
  }

  // =========================================================================
  // USER MANAGEMENT
  // =========================================================================

  async findOrgUsers(orgId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      isDeleted: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
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

  async inviteUser(orgId: string, dto: InviteUserDto) {
    // 1. Verify organization exists and check limits
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { users: { where: { isDeleted: false } } },
        },
      },
    });

    if (!org || org.isDeleted) {
      throw new NotFoundException('Organization not found.');
    }

    if (org._count.users >= org.maxUsers) {
      throw new BadRequestException(
        `Organization has reached the maximum limit of ${org.maxUsers} users.`,
      );
    }

    // 2. Check if user already exists
    const emailLower = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing && !existing.isDeleted) {
      throw new ConflictException(
        'A user with this email address already exists.',
      );
    }

    // 3. Create the user with random temporary password
    const tempPassword = uuidv4().substring(0, 12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userName = `${dto.firstName} ${dto.lastName}`.trim();

    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: userName,
        password: hashedPassword,
        phone: `+0000000000_${Date.now()}`, // Temporary phone to bypass unique constraint
        role: dto.role,
        organizationId: orgId,
        isActive: true,
      },
    });

    // 4. Send mock invitation email (mocking for now)
    console.log(
      `✉️ Sending mock invitation email to ${dto.email} with temporary credentials.`,
    );
    console.log(`Username: ${dto.email} | Temp Password: ${tempPassword}`);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === UserRoleType.SUPER_ADMIN) {
      throw new BadRequestException(
        'Cannot update SuperAdmin users through this endpoint.',
      );
    }

    const updatedData: any = {};
    if (dto.firstName !== undefined) updatedData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updatedData.lastName = dto.lastName;
    if (dto.role !== undefined) updatedData.role = dto.role;
    if (dto.isActive !== undefined) updatedData.isActive = dto.isActive;

    // Maintain composite name field if name parts are updated
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const fName =
        dto.firstName !== undefined ? dto.firstName : user.firstName || '';
      const lName =
        dto.lastName !== undefined ? dto.lastName : user.lastName || '';
      updatedData.name = `${fName} ${lName}`.trim() || user.name;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === UserRoleType.SUPER_ADMIN) {
      throw new BadRequestException('SuperAdmin users cannot be deleted.');
    }

    // Safety check: Cannot delete the last admin of an organization
    if (user.role === UserRoleType.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: UserRoleType.ADMIN,
          isDeleted: false,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last admin of this organization.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        isDeleted: true,
      },
    });
  }

  // =========================================================================
  // DASHBOARD STATS
  // =========================================================================

  async getDashboardStats() {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalActiveUsers,
      freeCount,
      proCount,
      enterpriseCount,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { isDeleted: false } }),
      this.prisma.organization.count({
        where: { isDeleted: false, isActive: true },
      }),
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.user.count({ where: { isDeleted: false, isActive: true } }),
      this.prisma.organization.count({
        where: { isDeleted: false, subscriptionTier: SubscriptionTier.FREE },
      }),
      this.prisma.organization.count({
        where: { isDeleted: false, subscriptionTier: SubscriptionTier.PRO },
      }),
      this.prisma.organization.count({
        where: {
          isDeleted: false,
          subscriptionTier: SubscriptionTier.ENTERPRISE,
        },
      }),
    ]);

    return {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalActiveUsers,
      subscriptionsBreakdown: {
        FREE: freeCount,
        PRO: proCount,
        ENTERPRISE: enterpriseCount,
      },
    };
  }
}
