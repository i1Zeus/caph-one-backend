import { TenantPrismaService } from 'src/prisma/tenant-prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { cleanPhoneNumber, compressImage } from '../../utils/help';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  FindAllUsersParams,
  PaginatedUsersResponse,
} from './dto/paginated-users-response.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService, private tenantPrisma: TenantPrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user with email already exists
    const existingUserByEmail = await this.tenantPrisma.client.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if user with phone already exists
    const cleanedPhone = cleanPhoneNumber(createUserDto.phone);
    const existingUserByPhone = await this.tenantPrisma.client.user.findUnique({
      where: { phone: cleanedPhone },
    });

    if (existingUserByPhone) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    // Validate password strength
    if (createUserDto.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Extract invitation fields and roleIds (these don't belong in the database)
      const {
        sendEmailInvitation,
        sendWhatsAppInvitation,
        customLoginUrl,
        roleIds,
        ...userData
      } = createUserDto;

      const data = {
        ...userData,
        password: hashedPassword,
        phone: cleanPhoneNumber(createUserDto.phone), // Clean the phone number
        // Note: roleIds are handled through userRoles relation after user creation
      };

      // Compress image if provided
      if (data.img) {
        data.img = await compressImage(data.img);
      }

      const user = await this.tenantPrisma.client.user.create({
        data,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          img: true,
          type: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Assign roles if provided
      if (roleIds && roleIds.length > 0) {
        // Validate that all roleIds exist
        const existingRoles = await this.tenantPrisma.client.role.findMany({
          where: {
            id: { in: roleIds },
            isDeleted: false,
          },
          select: { id: true },
        });

        const validRoleIds = existingRoles.map((role) => role.id);
        const invalidRoleIds = roleIds.filter(
          (id) => !validRoleIds.includes(id),
        );

        if (invalidRoleIds.length > 0) {
          throw new BadRequestException(
            `Invalid role IDs: ${invalidRoleIds.join(', ')}`,
          );
        }

        // Create UserRole records
        await this.tenantPrisma.client.userRole.createMany({
          data: validRoleIds.map((roleId) => ({
            userId: user.id,
            roleId: roleId,
          })),
        });
      }

      // Fetch the complete user with roles
      const userWithRoles = await this.tenantPrisma.client.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          img: true,
          type: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            where: { isDeleted: false },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      // Transform userRoles to roles array format
      const transformedUser = {
        ...userWithRoles,
        roles: userWithRoles.userRoles?.map((ur) => ur.role) || [],
        userRoles: undefined, // Remove the original userRoles field
      };

      // Send invitation notifications if requested
      if (
        createUserDto.sendEmailInvitation ||
        createUserDto.sendWhatsAppInvitation
      ) {
        try {
          const invitationResults =
            await this.notificationsService.sendUserInvitationNotification(
              transformedUser.name,
              transformedUser.email,
              createUserDto.password, // Send the original password as temporary password
              {
                email: createUserDto.sendEmailInvitation ?? true,
                whatsapp: createUserDto.sendWhatsAppInvitation ?? true,
                emailAddress: transformedUser.email,
                phoneNumber: transformedUser.phone,
              },
              createUserDto.customLoginUrl,
            );

          console.log('Invitation notifications sent:', invitationResults);
        } catch (error) {
          console.error('Failed to send invitation notifications:', error);
          // Don't throw error here - user creation should still succeed even if notifications fail
        }
      }

      return transformedUser;
    } catch (error) {
      // Handle any other database errors
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          throw new ConflictException('A user with this email already exists');
        }
        if (target?.includes('phone')) {
          throw new ConflictException(
            'A user with this phone number already exists',
          );
        }
        throw new ConflictException(
          'A user with this information already exists',
        );
      }
      throw error;
    }
  }

  async findAll(params: FindAllUsersParams): Promise<PaginatedUsersResponse> {
    const {
      page,
      limit,
      search,
      role,
      status,
      sortBy,
      sortOrder,
      workspaceId,
    } = params;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {
      isDeleted: false, // Only show non-deleted users
    };

    // Add workspace filtering if provided
    if (workspaceId) {
      where.workspaces = {
        some: {
          workspaceId: workspaceId,
        },
      };
    }

    // Add search filter
    if (search && search.trim()) {
      where.OR = [
        {
          name: {
            contains: search.trim(),
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search.trim(),
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search.trim(),
          },
        },
      ];
    }

    // Add role filter (now through userRoles relation)
    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
          isDeleted: false,
        },
      };
    }

    // Add status filter
    if (status && status !== 'all') {
      if (status === 'active') {
        where.isDeleted = false;
      } else if (status === 'inactive') {
        where.isDeleted = true;
      }
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Get total count for pagination metadata
    const total = await this.tenantPrisma.client.user.count({ where });

    // Get paginated users
    const users = await this.tenantPrisma.client.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        // role field removed - now using userRoles relation
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          where: {
            isDeleted: false, // Only include active role assignments
          },
          select: {
            role: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: [orderBy],
      skip,
      take: limit,
    });

    // Transform userRoles to roles array format
    const transformedUsers = users.map((user) => {
      console.log(`🔍 Transforming user ${user.name}:`, {
        userRoles: user.userRoles,
        rolesCount: user.userRoles?.length || 0,
      });

      const transformed = {
        ...user,
        roles: user.userRoles?.map((ur) => ur.role) || [],
        userRoles: undefined, // Remove the original userRoles field
      };

      console.log(`✅ Transformed user ${user.name}:`, {
        roles: transformed.roles,
        rolesCount: transformed.roles.length,
      });

      return transformed;
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: transformedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Search users by names with fuzzy matching and name variations
   * Supports partial matches, case-insensitive search, and common name variations
   */
  async searchUsersByNames(
    names: string[],
    workspaceId: string,
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    if (!names || names.length === 0 || !workspaceId) {
      return [];
    }

    // Clean and prepare search terms
    const searchTerms = names
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0);

    if (searchTerms.length === 0) {
      return [];
    }

    // Create comprehensive search conditions
    const searchConditions = searchTerms.flatMap((term) => [
      // Exact match (case-insensitive)
      {
        name: {
          equals: term,
          mode: 'insensitive' as const,
        },
      },
      // Contains match (case-insensitive)
      {
        name: {
          contains: term,
          mode: 'insensitive' as const,
        },
      },
      // Email contains (for usernames like john.doe)
      {
        email: {
          contains: term,
          mode: 'insensitive' as const,
        },
      },
      // Split name parts for compound names
      ...term
        .split(/[\s\-_.]+/)
        .filter((part) => part.length > 1)
        .map((part) => ({
          name: {
            contains: part,
            mode: 'insensitive' as const,
          },
        })),
    ]);

    const users = await this.tenantPrisma.client.user.findMany({
      where: {
        isDeleted: false,
        workspaces: {
          some: {
            workspaceId: workspaceId,
          },
        },
        OR: searchConditions,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 15, // Increased limit for better fuzzy matching results
    });

    // Remove duplicates and sort by relevance
    const uniqueUsers = users.filter(
      (user, index, self) => index === self.findIndex((u) => u.id === user.id),
    );

    // Sort by relevance - exact matches first, then partial matches
    const sortedUsers = uniqueUsers.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Check for exact matches
      const aExactMatch = searchTerms.some((term) => aName === term);
      const bExactMatch = searchTerms.some((term) => bName === term);

      if (aExactMatch && !bExactMatch) return -1;
      if (bExactMatch && !aExactMatch) return 1;

      // Check for starts with match
      const aStartsMatch = searchTerms.some((term) => aName.startsWith(term));
      const bStartsMatch = searchTerms.some((term) => bName.startsWith(term));

      if (aStartsMatch && !bStartsMatch) return -1;
      if (bStartsMatch && !aStartsMatch) return 1;

      // Sort by name length (shorter names first for common nicknames)
      return aName.length - bName.length;
    });

    return sortedUsers.slice(0, 10); // Return top 10 most relevant matches
  }

  // Keep the old findAll method for backward compatibility but mark as deprecated
  async findAllLegacy() {
    const users = await this.tenantPrisma.client.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        // role field removed - now using userRoles relation
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          where: { isDeleted: false },
          select: {
            role: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    // Transform userRoles to roles array format
    const transformedUsers = users.map((user) => ({
      ...user,
      roles: user.userRoles?.map((ur) => ur.role) || [],
      userRoles: undefined, // Remove the original userRoles field
    }));

    return transformedUsers;
  }

  async findOne(id: string) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        isSuperAdmin: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        type: true,
        isDeleted: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        userRoles: {
          where: { isDeleted: false },
          select: {
            role: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Transform userRoles to roles array format and include employee fields
    const transformedUser = {
      ...user,
      // Include employee fields if they exist
      firstName: user.employee?.firstName || null,
      lastName: user.employee?.lastName || null,
      dateOfBirth: user.employee?.dateOfBirth
        ? user.employee.dateOfBirth.toISOString().split('T')[0]
        : null,
      roles: user.userRoles?.map((ur) => ur.role) || [],
      userRoles: undefined, // Remove the original userRoles field
      employee: undefined, // Remove the original employee field
    };

    console.log(`🔍 findOne - User ${transformedUser.name}:`, {
      originalUserRoles: user.userRoles,
      transformedRoles: transformedUser.roles,
      rolesCount: transformedUser.roles.length,
    });

    return transformedUser;
  }

  async findByEmail(email: string) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async findByPhone(phone: string) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new NotFoundException(`User with phone ${phone} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check for unique constraints if email or phone is being updated
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUserByEmail = await this.tenantPrisma.client.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id }, // Exclude the current user from the check
        },
      });

      if (existingUserByEmail) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (updateUserDto.phone && updateUserDto.phone !== user.phone) {
      const cleanedPhone = cleanPhoneNumber(updateUserDto.phone);
      const existingUserByPhone = await this.tenantPrisma.client.user.findFirst({
        where: {
          phone: cleanedPhone,
          id: { not: id }, // Exclude the current user from the check
        },
      });

      if (existingUserByPhone) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
    }

    try {
      // Extract roleIds if present (roles are handled separately through role assignment endpoints)
      const { roleIds, ...updateData } = updateUserDto;
      const data = { ...updateData };

      // If password is being updated, hash it and validate strength
      if (updateUserDto.password) {
        if (updateUserDto.password.length < 6) {
          throw new BadRequestException(
            'Password must be at least 6 characters long',
          );
        }
        data.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Clean phone number if provided and it's different from the current one
      if (data.phone && data.phone !== user.phone) {
        data.phone = cleanPhoneNumber(data.phone);
      }

      // Compress image if provided
      if (data.img) {
        data.img = await compressImage(data.img);
      }

      const updatedUser = await this.tenantPrisma.client.user.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          img: true,
          type: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            where: { isDeleted: false },
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      // Transform userRoles to roles array format
      const transformedUser = {
        ...updatedUser,
        roles: updatedUser.userRoles?.map((ur) => ur.role) || [],
        userRoles: undefined, // Remove the original userRoles field
      };

      return transformedUser;
    } catch (error) {
      // Handle any other database errors
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          throw new ConflictException('A user with this email already exists');
        }
        if (target?.includes('phone')) {
          throw new ConflictException(
            'A user with this phone number already exists',
          );
        }
        throw new ConflictException(
          'A user with this information already exists',
        );
      }
      throw error;
    }
  }

  async updateSettings(
    id: string,
    updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Separate user fields from employee fields
    const { firstName, lastName, dateOfBirth, ...userData } =
      updateUserSettingsDto;

    // Compress image if provided
    if (userData.img) {
      userData.img = await compressImage(userData.img);
    }

    // Update user basic fields
    const updatedUser = await this.tenantPrisma.client.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Handle employee fields - create employee record if it doesn't exist
    const employeeData: any = {};

    if (firstName !== undefined) employeeData.firstName = firstName;
    if (lastName !== undefined) employeeData.lastName = lastName;
    if (dateOfBirth !== undefined)
      employeeData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    if (Object.keys(employeeData).length > 0) {
      if (user.employee) {
        // Update existing employee record
        await this.tenantPrisma.client.employee.update({
          where: { userId: id },
          data: employeeData,
        });
      } else {
        // Create new employee record for the user
        await this.tenantPrisma.client.employee.create({
          data: {
            userId: id,
            firstName: firstName || '',
            lastName: lastName || '',
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            employmentStatus: 'ACTIVE', // Default status
            employmentType: 'FULL_TIME', // Default type
          },
        });
      }
    }

    // Return the updated user with employee fields
    const finalUser = await this.tenantPrisma.client.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
      },
    });

    // Transform to include employee fields at the top level
    return {
      ...finalUser,
      firstName: finalUser.employee?.firstName || null,
      lastName: finalUser.employee?.lastName || null,
      dateOfBirth: finalUser.employee?.dateOfBirth
        ? finalUser.employee.dateOfBirth.toISOString().split('T')[0]
        : null,
      employee: undefined,
    };
  }

  async remove(id: string) {
    const user = await this.tenantPrisma.client.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete by setting isDeleted to true instead of hard delete
    // This preserves referential integrity and audit trail
    const deletedUser = await this.tenantPrisma.client.user.update({
      where: { id },
      data: { isDeleted: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        img: true,
        // role field removed - now using userRoles relation
        type: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return deletedUser;
  }
}
