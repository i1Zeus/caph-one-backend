import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserEntityAccessDto } from './dto/create-user-entity-access.dto';
import { UpdateUserEntityAccessDto } from './dto/update-user-entity-access.dto';

@Injectable()
export class UserEntityAccessService {
  constructor(private prisma: PrismaService) {}

  // Create user-entity type assignments
  async create(createDto: CreateUserEntityAccessDto) {
    // Validate that at least one entity type is provided
    if (!createDto.entityTypes || createDto.entityTypes.length === 0) {
      throw new BadRequestException(
        'At least one entity type must be provided',
      );
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${createDto.userId} not found`);
    }

    // Create assignments for each entity type
    const assignments = await Promise.all(
      createDto.entityTypes.map(async (entityType) => {
        // Check if assignment already exists (regardless of isDeleted status)
        // This handles the case where records were soft-deleted but still exist
        const existing = await this.prisma.userEntityAccess.findFirst({
          where: {
            userId: createDto.userId,
            entityType,
          },
        });

        if (existing) {
          // Restore if deleted, or return if already active
          if (existing.isDeleted) {
            return this.prisma.userEntityAccess.update({
              where: { id: existing.id },
              data: { isDeleted: false },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            });
          }
          // Already exists and is active, return it
          return this.prisma.userEntityAccess.findUnique({
            where: { id: existing.id },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
        }

        // Create new assignment
        return this.prisma.userEntityAccess.create({
          data: {
            userId: createDto.userId,
            entityType,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }),
    );

    return assignments;
  }

  // Get all assignments with optional filters
  async findAll(filters?: { userId?: string; entityType?: EntityType }) {
    const where: any = { isDeleted: false };

    if (filters) {
      if (filters.userId) {
        where.userId = filters.userId;
      }
      if (filters.entityType) {
        where.entityType = filters.entityType;
      }
    }

    return this.prisma.userEntityAccess.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all entity types assigned to a user
  async findByUserId(userId: string) {
    return this.prisma.userEntityAccess.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Get all users assigned to an entity type
  async findByEntityType(entityType: EntityType) {
    return this.prisma.userEntityAccess.findMany({
      where: {
        entityType,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // Get one assignment by ID
  async findOne(id: string) {
    const access = await this.prisma.userEntityAccess.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException(`User entity access with ID ${id} not found`);
    }

    return access;
  }

  // Update an assignment (replace all entity types for a user)
  async update(userId: string, updateDto: UpdateUserEntityAccessDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!updateDto.entityTypes || updateDto.entityTypes.length === 0) {
      throw new BadRequestException(
        'At least one entity type must be provided',
      );
    }

    // Delete all existing assignments for this user
    await this.prisma.userEntityAccess.updateMany({
      where: { userId, isDeleted: false },
      data: { isDeleted: true },
    });

    // Create new assignments
    return this.create({ userId, entityTypes: updateDto.entityTypes });
  }

  // Delete an assignment (soft delete)
  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.userEntityAccess.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Delete all assignments for a user
  async removeByUserId(userId: string) {
    return this.prisma.userEntityAccess.updateMany({
      where: { userId, isDeleted: false },
      data: { isDeleted: true },
    });
  }

  // Get entity types user can access
  async getUserAccessibleEntityTypes(
    userId: string,
    isAdmin: boolean,
  ): Promise<EntityType[]> {
    if (isAdmin) {
      // Admin can access all entity types
      return [
        EntityType.PROPERTY_GROUP,
        EntityType.CITY_CENTER,
        EntityType.SPORTS_CITY,
      ];
    }

    const accesses = await this.prisma.userEntityAccess.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: {
        entityType: true,
      },
    });

    return accesses.map((a) => a.entityType);
  }

  // Check if user has access to a specific entity type
  async userHasAccessToEntityType(
    userId: string,
    entityType: EntityType,
    isAdmin: boolean,
  ): Promise<boolean> {
    if (isAdmin) {
      return true;
    }

    const access = await this.prisma.userEntityAccess.findFirst({
      where: {
        userId,
        entityType,
        isDeleted: false,
      },
    });

    return !!access;
  }
}
