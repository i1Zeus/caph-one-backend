import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  CityCenterFilter,
  PropertyGroupFilter,
  PropertyStatus,
  PropertyType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { Property } from './entities';
import { UserEntityAccessService } from './user-entity-access.service';

@Injectable()
export class PropertyService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UserEntityAccessService))
    private userEntityAccessService: UserEntityAccessService,
  ) {}

  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    // Ensure only one relationship is set
    const relationshipCount = [
      createPropertyDto.groupId,
      createPropertyDto.cityCenterId,
      createPropertyDto.sportsCityId,
    ].filter(Boolean).length;

    if (relationshipCount > 1) {
      throw new BadRequestException(
        'Property can only belong to one entity (PropertyGroup, CityCenter, or SportsCity)',
      );
    }

    const property = await this.prisma.property.create({
      data: {
        ...createPropertyDto,
        images: createPropertyDto.images || [],
        documents: createPropertyDto.documents || [],
        status: createPropertyDto.status || PropertyStatus.AVAILABLE,
      },
    });

    return property;
  }

  async findAll(
    filters?: {
      propertyType?: PropertyType;
      status?: PropertyStatus;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
      groupId?: number;
      cityCenterId?: number;
      sportsCityId?: number;
      propertyGroupFilter?: PropertyGroupFilter;
      cityCenterFilter?: CityCenterFilter;
    },
    userId?: string,
    isAdmin?: boolean,
  ): Promise<Property[]> {
    const where: any = { isDeleted: false };

    if (filters) {
      if (filters.propertyType) {
        where.propertyType = filters.propertyType;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }
      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice) {
          where.price.lte = filters.maxPrice;
        }
      }
      if (filters.groupId) {
        where.groupId = filters.groupId;
      }
      if (filters.cityCenterId) {
        where.cityCenterId = filters.cityCenterId;
      }
      if (filters.sportsCityId) {
        where.sportsCityId = filters.sportsCityId;
      }
      if (filters.propertyGroupFilter) {
        where.propertyGroupFilter = filters.propertyGroupFilter;
      }
      if (filters.cityCenterFilter) {
        where.cityCenterFilter = filters.cityCenterFilter;
      }
    }

    // Filter by user access if userId provided and not admin
    if (userId && !isAdmin) {
      const accessibleTypes =
        await this.userEntityAccessService.getUserAccessibleEntityTypes(
          userId,
          false,
        );

      // Build OR condition: property must belong to one of the user's accessible entity types
      const orConditions: any[] = [];

      if (accessibleTypes.includes('PROPERTY_GROUP' as any)) {
        orConditions.push({ groupId: { not: null } });
      }
      if (accessibleTypes.includes('CITY_CENTER' as any)) {
        orConditions.push({ cityCenterId: { not: null } });
      }
      if (accessibleTypes.includes('SPORTS_CITY' as any)) {
        orConditions.push({ sportsCityId: { not: null } });
      }

      // If user has no accessible entity types, return empty array
      if (orConditions.length === 0) {
        return [];
      }

      // Add OR condition to where clause
      where.OR = orConditions;
    }

    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        contracts: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return properties;
  }

  async findAllPaginated(
    filters?: {
      propertyType?: PropertyType;
      status?: PropertyStatus;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
      groupId?: number;
      cityCenterId?: number;
      sportsCityId?: number;
      propertyGroupFilter?: PropertyGroupFilter;
      cityCenterFilter?: CityCenterFilter;
    },
    page: number = 1,
    limit: number = 10,
    userId?: string,
    isAdmin?: boolean,
  ): Promise<{
    data: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const where: any = { isDeleted: false };

    if (filters) {
      if (filters.propertyType) {
        where.propertyType = filters.propertyType;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }
      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) {
          where.price.gte = filters.minPrice;
        }
        if (filters.maxPrice) {
          where.price.lte = filters.maxPrice;
        }
      }
      if (filters.groupId) {
        where.groupId = filters.groupId;
      }
      if (filters.cityCenterId) {
        where.cityCenterId = filters.cityCenterId;
      }
      if (filters.sportsCityId) {
        where.sportsCityId = filters.sportsCityId;
      }
      if (filters.propertyGroupFilter) {
        where.propertyGroupFilter = filters.propertyGroupFilter;
      }
      if (filters.cityCenterFilter) {
        where.cityCenterFilter = filters.cityCenterFilter;
      }
    }

    // Filter by user access if userId provided and not admin
    if (userId && !isAdmin) {
      const accessibleTypes =
        await this.userEntityAccessService.getUserAccessibleEntityTypes(
          userId,
          false,
        );

      // Build OR condition: property must belong to one of the user's accessible entity types
      const orConditions: any[] = [];

      if (accessibleTypes.includes('PROPERTY_GROUP' as any)) {
        orConditions.push({ groupId: { not: null } });
      }
      if (accessibleTypes.includes('CITY_CENTER' as any)) {
        orConditions.push({ cityCenterId: { not: null } });
      }
      if (accessibleTypes.includes('SPORTS_CITY' as any)) {
        orConditions.push({ sportsCityId: { not: null } });
      }

      // If user has no accessible entity types, return empty array
      if (orConditions.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      // Add OR condition to where clause
      where.OR = orConditions;
    }

    // Get total count
    const total = await this.prisma.property.count({ where });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Get paginated properties
    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        contracts: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return {
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async findOne(id: number): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { id, isDeleted: false },
      include: {
        contracts: {
          where: { isDeleted: false },
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            invoices: {
              where: { isDeleted: false },
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                paidAmount: true,
                remainingAmount: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async update(
    id: number,
    updatePropertyDto: UpdatePropertyDto,
  ): Promise<Property> {
    // Check if property exists
    await this.findOne(id);

    // Ensure only one relationship is set if any are being updated
    const relationshipFields = [
      updatePropertyDto.groupId,
      updatePropertyDto.cityCenterId,
      updatePropertyDto.sportsCityId,
    ].filter((val) => val !== undefined);

    if (relationshipFields.length > 1) {
      throw new BadRequestException(
        'Property can only belong to one entity (PropertyGroup, CityCenter, or SportsCity)',
      );
    }

    const property = await this.prisma.property.update({
      where: { id },
      data: updatePropertyDto,
    });

    return property;
  }

  async remove(id: number): Promise<Property> {
    // Check if property exists
    await this.findOne(id);

    // Soft delete
    const property = await this.prisma.property.update({
      where: { id },
      data: { isDeleted: true },
    });

    return property;
  }

  // Statistics
  async getStatistics() {
    const [
      totalProperties,
      availableProperties,
      soldProperties,
      rentedProperties,
      propertiesPriceData,
      byType,
      byStatus,
    ] = await Promise.all([
      this.prisma.property.count({ where: { isDeleted: false } }),
      this.prisma.property.count({
        where: { isDeleted: false, status: PropertyStatus.AVAILABLE },
      }),
      this.prisma.property.count({
        where: { isDeleted: false, status: PropertyStatus.SOLD },
      }),
      this.prisma.property.count({
        where: { isDeleted: false, status: PropertyStatus.RENTED },
      }),
      this.prisma.property.findMany({
        where: { isDeleted: false, status: PropertyStatus.AVAILABLE },
        select: { price: true, currency: true },
      }),
      this.prisma.property.groupBy({
        by: ['propertyType'],
        where: { isDeleted: false },
        _count: true,
      }),
      this.prisma.property.groupBy({
        by: ['status'],
        where: { isDeleted: false },
        _count: true,
      }),
    ]);

    let totalValue = 0;
    for (const p of propertiesPriceData) {
      if (p.price) {
        const priceNum = Number(p.price);
        if (!isNaN(priceNum)) {
          if (p.currency === 'USD') {
            totalValue += priceNum * 1450; // Convert USD to IQD for unified statistics
          } else {
            totalValue += priceNum;
          }
        }
      }
    }

    return {
      totalProperties,
      availableProperties,
      soldProperties,
      rentedProperties,
      totalValue,
      byType,
      byStatus,
    };
  }


  // Extract coordinates from Google Maps URL
  async extractCoordinatesFromUrl(
    url: string,
  ): Promise<{ lat: number; lng: number } | null> {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      // First, try to extract from URL parameters (for full URLs)
      const googleMapsQ = url.match(/[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
      if (googleMapsQ) {
        return {
          lat: parseFloat(googleMapsQ[1]),
          lng: parseFloat(googleMapsQ[2]),
        };
      }

      const googleMapsAt = url.match(/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
      if (googleMapsAt) {
        return {
          lat: parseFloat(googleMapsAt[1]),
          lng: parseFloat(googleMapsAt[2]),
        };
      }

      // If it's a shortened URL or we couldn't extract from URL, fetch HTML and extract from there
      if (
        url.includes('goo.gl') ||
        url.includes('maps.app.goo.gl') ||
        !googleMapsQ
      ) {
        // Fetch HTML directly using Node's fetch (server-side, no CORS issues)
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch URL: ${response.status} ${response.statusText}`,
          );
        }

        const html = await response.text();

        // Extract from static map URLs in meta tags (center=30.525533%2C47.780332)
        const staticMapMatch = html.match(
          /center=([+-]?\d+\.?\d*)%2C([+-]?\d+\.?\d*)/i,
        );
        if (staticMapMatch) {
          const lat = parseFloat(staticMapMatch[1]);
          const lng = parseFloat(staticMapMatch[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Extract from markers parameter (markers=30.525533%2C47.780332)
        const markersMatch = html.match(
          /markers=([+-]?\d+\.?\d*)%2C([+-]?\d+\.?\d*)/i,
        );
        if (markersMatch) {
          const lat = parseFloat(markersMatch[1]);
          const lng = parseFloat(markersMatch[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Extract from patterns like [null,null,30.5250306,47.8291479] (common in area links)
        const nullNullPattern = html.match(
          /\[null,null,([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)\]/,
        );
        if (nullNullPattern) {
          const lat = parseFloat(nullNullPattern[1]);
          const lng = parseFloat(nullNullPattern[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Extract from APP_INITIALIZATION_STATE - handle different formats
        // Format 1: [[[zoom,lng,lat] or [[[lat,lng]
        const initStateMatch1 = html.match(
          /APP_INITIALIZATION_STATE\s*=\s*\[\[\[([+-]?\d+\.?\d*),([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        );
        if (initStateMatch1) {
          const val1 = parseFloat(initStateMatch1[1]);
          const val2 = parseFloat(initStateMatch1[2]);
          const val3 = parseFloat(initStateMatch1[3]);

          // Check if first value is zoom level (usually > 1000) or coordinates
          if (val1 > 1000) {
            // Format: [zoom, lng, lat]
            const lng = val2;
            const lat = val3;
            if (
              !isNaN(lat) &&
              !isNaN(lng) &&
              Math.abs(lat) <= 90 &&
              Math.abs(lng) <= 180
            ) {
              return { lat, lng };
            }
          } else {
            // Format: [lat, lng, ...]
            const lat = val1;
            const lng = val2;
            if (
              !isNaN(lat) &&
              !isNaN(lng) &&
              Math.abs(lat) <= 90 &&
              Math.abs(lng) <= 180
            ) {
              return { lat, lng };
            }
          }
        }

        // Format 2: Simple [[[lat,lng] pattern
        const initStateMatch2 = html.match(
          /\[\[\[([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)\]/,
        );
        if (initStateMatch2) {
          const lat = parseFloat(initStateMatch2[1]);
          const lng = parseFloat(initStateMatch2[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Extract from data structures like [2,lat,lng] or similar patterns
        const dataPattern = html.match(
          /\[(\d+),([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)\]/,
        );
        if (dataPattern) {
          const lat = parseFloat(dataPattern[2]);
          const lng = parseFloat(dataPattern[3]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Extract coordinates from URL patterns in the HTML (like /@30.5250306,47.8291479)
        const urlPattern = html.match(/\/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/);
        if (urlPattern) {
          const lat = parseFloat(urlPattern[1]);
          const lng = parseFloat(urlPattern[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            return { lat, lng };
          }
        }

        // Fallback: Extract any valid lat,lng pair that appears multiple times (common for area centers)
        // Look for patterns like "30.5250306,47.8291479" that appear in the HTML
        const coordPairs = html.matchAll(
          /([+-]?\d{1,2}\.\d{4,}),([+-]?\d{1,3}\.\d{4,})/g,
        );
        const coordCounts = new Map<string, number>();
        for (const match of coordPairs) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (
            !isNaN(lat) &&
            !isNaN(lng) &&
            Math.abs(lat) <= 90 &&
            Math.abs(lng) <= 180
          ) {
            const key = `${lat},${lng}`;
            coordCounts.set(key, (coordCounts.get(key) || 0) + 1);
          }
        }

        // Find the most common coordinate pair (likely the center of the area)
        if (coordCounts.size > 0) {
          let maxCount = 0;
          let mostCommon = null;
          for (const [coords, count] of coordCounts.entries()) {
            if (count > maxCount) {
              maxCount = count;
              mostCommon = coords;
            }
          }

          if (mostCommon && maxCount >= 2) {
            const [lat, lng] = mostCommon.split(',').map(parseFloat);
            return { lat, lng };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting coordinates from URL:', error);
      throw new BadRequestException(
        `Failed to extract coordinates: ${error.message}`,
      );
    }
  }
}
