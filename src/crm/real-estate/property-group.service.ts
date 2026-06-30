import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyGroupDto } from './dto/create-property-group.dto';
import { UpdatePropertyGroupDto } from './dto/update-property-group.dto';
import { UserEntityAccessService } from './user-entity-access.service';

@Injectable()
export class PropertyGroupService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UserEntityAccessService))
    private userEntityAccessService: UserEntityAccessService,
  ) {}

  // Create a new property group
  async create(createPropertyGroupDto: CreatePropertyGroupDto) {
    return this.prisma.propertyGroup.create({
      data: createPropertyGroupDto,
    });
  }

  // Get all property groups with optional filters
  async findAll(search?: string, userId?: string, isAdmin?: boolean) {
    const where: any = { isDeleted: false };

    // Add name search filter
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filter by user access if userId provided and not admin
    if (userId && !isAdmin) {
      const hasAccess =
        await this.userEntityAccessService.userHasAccessToEntityType(
          userId,
          'PROPERTY_GROUP' as any,
          false,
        );
      // If user doesn't have access to property groups, return empty array
      if (!hasAccess) {
        return [];
      }
    }

    return this.prisma.propertyGroup.findMany({
      where,
      include: {
        properties: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            propertyType: true,
            status: true,
            price: true,
            city: true,
            district: true,
            images: true,
          },
        },
        _count: {
          select: {
            properties: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get one property group by ID
  async findOne(id: number) {
    const group = await this.prisma.propertyGroup.findFirst({
      where: { id, isDeleted: false },
      include: {
        properties: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Property group with ID ${id} not found`);
    }

    return group;
  }

  // Update a property group
  async update(id: number, updatePropertyGroupDto: UpdatePropertyGroupDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.propertyGroup.update({
      where: { id },
      data: updatePropertyGroupDto,
    });
  }

  // Delete a property group (soft delete)
  async remove(id: number) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.propertyGroup.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Get statistics for a property group
  async getStatistics(id: number) {
    await this.findOne(id);

    const properties = await this.prisma.property.findMany({
      where: {
        groupId: id,
        isDeleted: false,
      },
      select: {
        status: true,
        price: true,
      },
    });

    const totalProperties = properties.length;
    const availableProperties = properties.filter(
      (p) => p.status === 'AVAILABLE',
    ).length;
    const soldProperties = properties.filter((p) => p.status === 'SOLD').length;
    const rentedProperties = properties.filter(
      (p) => p.status === 'RENTED',
    ).length;
    const totalValue = properties.reduce(
      (sum, p) => sum + Number(p.price || 0),
      0,
    );

    return {
      totalProperties,
      availableProperties,
      soldProperties,
      rentedProperties,
      totalValue,
    };
  }
}
