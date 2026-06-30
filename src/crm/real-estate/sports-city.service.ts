import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSportsCityDto } from './dto/create-sports-city.dto';
import { UpdateSportsCityDto } from './dto/update-sports-city.dto';
import { UserEntityAccessService } from './user-entity-access.service';

@Injectable()
export class SportsCityService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UserEntityAccessService))
    private userEntityAccessService: UserEntityAccessService,
  ) {}

  // Create a new sports city
  async create(createSportsCityDto: CreateSportsCityDto) {
    return this.prisma.sportsCity.create({
      data: createSportsCityDto,
    });
  }

  // Get all sports cities with optional search filter
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
          'SPORTS_CITY' as any,
          false,
        );
      // If user doesn't have access to sports cities, return empty array
      if (!hasAccess) {
        return [];
      }
    }

    return this.prisma.sportsCity.findMany({
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

  // Get one sports city by ID
  async findOne(id: number) {
    const sportsCity = await this.prisma.sportsCity.findFirst({
      where: { id, isDeleted: false },
      include: {
        properties: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sportsCity) {
      throw new NotFoundException(`Sports city with ID ${id} not found`);
    }

    return sportsCity;
  }

  // Update a sports city
  async update(id: number, updateSportsCityDto: UpdateSportsCityDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.sportsCity.update({
      where: { id },
      data: updateSportsCityDto,
    });
  }

  // Delete a sports city (soft delete)
  async remove(id: number) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.sportsCity.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Get statistics for a sports city
  async getStatistics(id: number) {
    await this.findOne(id);

    const properties = await this.prisma.property.findMany({
      where: {
        sportsCityId: id,
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
