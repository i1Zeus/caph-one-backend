import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCityCenterDto } from './dto/create-city-center.dto';
import { UpdateCityCenterDto } from './dto/update-city-center.dto';
import { UserEntityAccessService } from './user-entity-access.service';

@Injectable()
export class CityCenterService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UserEntityAccessService))
    private userEntityAccessService: UserEntityAccessService,
  ) {}

  // Create a new city center
  async create(createCityCenterDto: CreateCityCenterDto) {
    return this.prisma.cityCenter.create({
      data: createCityCenterDto,
    });
  }

  // Get all city centers with optional filters
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
          'CITY_CENTER' as any,
          false,
        );
      // If user doesn't have access to city centers, return empty array
      if (!hasAccess) {
        return [];
      }
    }

    return this.prisma.cityCenter.findMany({
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

  // Get one city center by ID
  async findOne(id: number) {
    const cityCenter = await this.prisma.cityCenter.findFirst({
      where: { id, isDeleted: false },
      include: {
        properties: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cityCenter) {
      throw new NotFoundException(`City center with ID ${id} not found`);
    }

    return cityCenter;
  }

  // Update a city center
  async update(id: number, updateCityCenterDto: UpdateCityCenterDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.cityCenter.update({
      where: { id },
      data: updateCityCenterDto,
    });
  }

  // Delete a city center (soft delete)
  async remove(id: number) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.cityCenter.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Get statistics for a city center
  async getStatistics(id: number) {
    await this.findOne(id);

    const properties = await this.prisma.property.findMany({
      where: {
        cityCenterId: id,
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
