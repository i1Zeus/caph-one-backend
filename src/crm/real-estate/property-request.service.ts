import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PropertyStatus, RequestStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntityAccessService } from './user-entity-access.service';
import { WhatsAppService } from '../../notifications/whatsapp/whatsapp.service';
import {
  CreatePropertyRequestDto,
  SearchPropertiesDto,
  UpdatePropertyRequestDto,
} from './dto';
import { PropertyRequest } from './entities';

@Injectable()
export class PropertyRequestService {
  private readonly logger = new Logger(PropertyRequestService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => UserEntityAccessService))
    private userEntityAccessService: UserEntityAccessService,
    private whatsAppService: WhatsAppService,
  ) {}

  async create(
    createPropertyRequestDto: CreatePropertyRequestDto,
  ): Promise<PropertyRequest> {
    // Verify lead exists
    const lead = await this.prisma.lead.findFirst({
      where: { id: createPropertyRequestDto.leadId, isDeleted: false },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const request = await this.prisma.propertyRequest.create({
      data: {
        ...createPropertyRequestDto,
        status: createPropertyRequestDto.status || RequestStatus.PENDING,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Send WhatsApp notification to the lead if phone number exists
    if (lead.phone) {
      const message = `شركة العروش العقارية | Al Oroush Real Estate

نشكركم على ثقتكم بنا.

تم تسجيل طلبكم بنجاح وإدراجه ضمن قائمة المتابعة الخاصة بالشركة، وسيتم التواصل معكم مباشرة عند توفر العقار المطابق لطلبكم.

مع التقدير،
شركة العروش العقارية

---

Thank you for your trust in us.

Your request has been successfully registered and added to our follow-up list. We will contact you directly once a property matching your requirements becomes available.

Best regards,
Al Oroush Real Estate`;

      this.whatsAppService.sendTextMessage(lead.phone, message).catch(err => {
        this.logger.error(`Failed to send WhatsApp request confirmation to ${lead.phone}`, err);
      });
    }

    return request;
  }

  async findAll(
    filters?: {
      leadId?: string;
      status?: RequestStatus;
      propertyType?: string;
      city?: string;
    },
    userId?: string,
    isAdmin?: boolean,
  ): Promise<PropertyRequest[]> {
    const where: any = { isDeleted: false };

    if (filters) {
      if (filters.leadId) {
        where.leadId = filters.leadId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.propertyType) {
        where.propertyType = filters.propertyType;
      }
      if (filters.city) {
        where.city = { contains: filters.city, mode: 'insensitive' };
      }
    }

    // Filter by user access if userId provided and not admin
    if (userId && !isAdmin) {
      const accessibleTypes =
        await this.userEntityAccessService.getUserAccessibleEntityTypes(
          userId,
          false,
        );

      // If user has no accessible entity types, return empty array
      if (accessibleTypes.length === 0) {
        return [];
      }

      where.entityType = { in: accessibleTypes };
    }

    const requests = await this.prisma.propertyRequest.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        contracts: {
          where: { isDeleted: false },
          select: {
            id: true,
            contractNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async findOne(id: number): Promise<PropertyRequest> {
    const request = await this.prisma.propertyRequest.findFirst({
      where: { id, isDeleted: false },
      include: {
        lead: true,
        contracts: {
          where: { isDeleted: false },
          include: {
            property: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Property request with ID ${id} not found`);
    }

    return request;
  }

  async update(
    id: number,
    updatePropertyRequestDto: UpdatePropertyRequestDto,
  ): Promise<PropertyRequest> {
    // Check if request exists
    await this.findOne(id);

    const request = await this.prisma.propertyRequest.update({
      where: { id },
      data: updatePropertyRequestDto,
      include: {
        lead: true,
      },
    });

    return request;
  }

  async remove(id: number): Promise<PropertyRequest> {
    // Check if request has been converted to contract
    const contractCount = await this.prisma.propertyContract.count({
      where: { requestId: id, isDeleted: false },
    });
    if (contractCount > 0) {
      throw new BadRequestException(
        'Cannot delete a request that has been converted to a contract',
      );
    }

    // Soft delete
    const deletedRequest = await this.prisma.propertyRequest.update({
      where: { id },
      data: { isDeleted: true },
    });

    return deletedRequest;
  }

  /**
   * البحث عن عقارات مطابقة لطلب معين
   * Searches for properties that match a specific request
   */
  async searchMatchingProperties(
    requestId: number,
    searchDto: SearchPropertiesDto = {},
  ): Promise<any[]> {
    // جلب الطلب
    const request = await this.findOne(requestId);

    // بناء شرط البحث
    const where: any = {
      isDeleted: false,
      status: PropertyStatus.AVAILABLE, // فقط العقارات المتاحة
    };

    // نوع العقار
    if (request.propertyType) {
      where.propertyType = request.propertyType;
    }

    // الموقع
    if (request.city) {
      where.city = { contains: request.city, mode: 'insensitive' };
    }
    if (request.district) {
      where.district = { contains: request.district, mode: 'insensitive' };
    }

    // جلب جميع العقارات التي تطابق الشروط الأساسية
    const properties = await this.prisma.property.findMany({
      where,
      include: {
        contracts: {
          where: { isDeleted: false },
          select: {
            id: true,
            contractNumber: true,
            status: true,
          },
        },
      },
    });

    // حساب نسبة التطابق لكل عقار
    const propertiesWithMatch = properties.map((property) => {
      const matchScore = this.calculateMatchScore(request, property);
      return {
        ...property,
        matchPercentage: matchScore,
        calculatedArea:
          property.length && property.width
            ? Number(property.length) * Number(property.width)
            : null,
      };
    });

    // فلترة العقارات بناءً على نسبة التطابق الأدنى
    const minMatchPercentage = searchDto.minMatchPercentage || 50;
    const filteredProperties = propertiesWithMatch.filter(
      (p) => p.matchPercentage >= minMatchPercentage,
    );

    // ترتيب حسب نسبة التطابق (الأعلى أولاً)
    filteredProperties.sort((a, b) => b.matchPercentage - a.matchPercentage);

    // تحديد عدد النتائج
    const limit = searchDto.limit || 20;
    return filteredProperties.slice(0, limit);
  }

  /**
   * حساب نسبة تطابق عقار مع طلب
   * Calculates match score between a property and a request
   */
  private calculateMatchScore(request: any, property: any): number {
    let totalPoints = 0;
    let matchedPoints = 0;

    // نوع العقار مطابق (نقطة أساسية - وزن: 2)
    // هذا يضمن وجود نقاط حتى لو لم تكن هناك معايير أخرى
    if (request.propertyType && property.propertyType) {
      totalPoints += 2;
      if (request.propertyType === property.propertyType) {
        matchedPoints += 2;
      }
    }

    // الموقع - المدينة (وزن: 2)
    if (request.city) {
      totalPoints += 2;
      if (
        property.city &&
        property.city.toLowerCase().includes(request.city.toLowerCase())
      ) {
        matchedPoints += 2;
      }
    }

    // الموقع - الحي (وزن: 1)
    if (request.district) {
      totalPoints += 1;
      if (
        property.district &&
        property.district.toLowerCase().includes(request.district.toLowerCase())
      ) {
        matchedPoints += 1;
      }
    }

    // السعر (وزن: 3)
    if (request.priceMin !== null || request.priceMax !== null) {
      totalPoints += 3;
      if (property.price) {
        const price = Number(property.price);
        const priceMin = request.priceMin ? Number(request.priceMin) : 0;
        const priceMax = request.priceMax ? Number(request.priceMax) : Infinity;
        if (price >= priceMin && price <= priceMax) {
          matchedPoints += 3;
        }
      }
    }

    // المساحة (length × width) (وزن: 2)
    if (
      request.lengthMin !== null ||
      request.lengthMax !== null ||
      request.widthMin !== null ||
      request.widthMax !== null
    ) {
      totalPoints += 2;
      if (property.length && property.width) {
        const lengthMin = request.lengthMin ? Number(request.lengthMin) : 0;
        const lengthMax = request.lengthMax
          ? Number(request.lengthMax)
          : Infinity;
        const widthMin = request.widthMin ? Number(request.widthMin) : 0;
        const widthMax = request.widthMax ? Number(request.widthMax) : Infinity;

        const length = Number(property.length);
        const width = Number(property.width);

        if (
          length >= lengthMin &&
          length <= lengthMax &&
          width >= widthMin &&
          width <= widthMax
        ) {
          matchedPoints += 2;
        }
      }
    }

    // مساحة البناء (وزن: 2)
    if (request.builtUpAreaMin !== null || request.builtUpAreaMax !== null) {
      totalPoints += 2;
      if (property.builtUpArea) {
        const builtUpArea = Number(property.builtUpArea);
        const min = request.builtUpAreaMin ? Number(request.builtUpAreaMin) : 0;
        const max = request.builtUpAreaMax
          ? Number(request.builtUpAreaMax)
          : Infinity;
        if (builtUpArea >= min && builtUpArea <= max) {
          matchedPoints += 2;
        }
      }
    }

    // عدد غرف النوم (وزن: 2)
    if (request.bedroomsMin !== null || request.bedroomsMax !== null) {
      totalPoints += 2;
      if (property.bedrooms !== null) {
        const min = request.bedroomsMin || 0;
        const max = request.bedroomsMax || Infinity;
        if (property.bedrooms >= min && property.bedrooms <= max) {
          matchedPoints += 2;
        }
      }
    }

    // عدد الحمامات (وزن: 1)
    if (request.bathroomsMin !== null || request.bathroomsMax !== null) {
      totalPoints += 1;
      if (property.bathrooms !== null) {
        const min = request.bathroomsMin || 0;
        const max = request.bathroomsMax || Infinity;
        if (property.bathrooms >= min && property.bathrooms <= max) {
          matchedPoints += 1;
        }
      }
    }

    // عدد الطوابق (وزن: 1)
    if (request.floorsMin !== null || request.floorsMax !== null) {
      totalPoints += 1;
      if (property.floors !== null) {
        const min = request.floorsMin || 0;
        const max = request.floorsMax || Infinity;
        if (property.floors >= min && property.floors <= max) {
          matchedPoints += 1;
        }
      }
    }

    // مواقف السيارات (وزن: 1)
    if (
      request.parkingSpacesMin !== null ||
      request.parkingSpacesMax !== null
    ) {
      totalPoints += 1;
      if (property.parkingSpaces !== null) {
        const min = request.parkingSpacesMin || 0;
        const max = request.parkingSpacesMax || Infinity;
        if (property.parkingSpaces >= min && property.parkingSpaces <= max) {
          matchedPoints += 1;
        }
      }
    }

    // سنة البناء (وزن: 1)
    if (request.yearBuiltMin !== null || request.yearBuiltMax !== null) {
      totalPoints += 1;
      if (property.yearBuilt !== null) {
        const min = request.yearBuiltMin || 0;
        const max = request.yearBuiltMax || new Date().getFullYear();
        if (property.yearBuilt >= min && property.yearBuilt <= max) {
          matchedPoints += 1;
        }
      }
    }

    // المصاعد (وزن: 1)
    if (request.elevatorsMin !== null || request.elevatorsMax !== null) {
      totalPoints += 1;
      if (property.elevators !== null) {
        const min = request.elevatorsMin || 0;
        const max = request.elevatorsMax || Infinity;
        if (property.elevators >= min && property.elevators <= max) {
          matchedPoints += 1;
        }
      }
    }

    // الشرفات (وزن: 1)
    if (request.balconiesMin !== null || request.balconiesMax !== null) {
      totalPoints += 1;
      if (property.balconies !== null) {
        const min = request.balconiesMin || 0;
        const max = request.balconiesMax || Infinity;
        if (property.balconies >= min && property.balconies <= max) {
          matchedPoints += 1;
        }
      }
    }

    // مساحة الحديقة (وزن: 1)
    if (request.gardenAreaMin !== null || request.gardenAreaMax !== null) {
      totalPoints += 1;
      if (property.gardenArea) {
        const gardenArea = Number(property.gardenArea);
        const min = request.gardenAreaMin ? Number(request.gardenAreaMin) : 0;
        const max = request.gardenAreaMax
          ? Number(request.gardenAreaMax)
          : Infinity;
        if (gardenArea >= min && gardenArea <= max) {
          matchedPoints += 1;
        }
      }
    }

    // المميزات الإضافية (وزن: 0.5 لكل ميزة)
    if (request.hasSwimmingPool !== null) {
      totalPoints += 0.5;
      if (property.hasSwimmingPool === request.hasSwimmingPool) {
        matchedPoints += 0.5;
      }
    }
    if (request.hasGym !== null) {
      totalPoints += 0.5;
      if (property.hasGym === request.hasGym) {
        matchedPoints += 0.5;
      }
    }
    if (request.hasMaidRoom !== null) {
      totalPoints += 0.5;
      if (property.hasMaidRoom === request.hasMaidRoom) {
        matchedPoints += 0.5;
      }
    }
    if (request.hasStorage !== null) {
      totalPoints += 0.5;
      if (property.hasStorage === request.hasStorage) {
        matchedPoints += 0.5;
      }
    }

    // نوع التشطيب (وزن: 1)
    if (request.finishingType) {
      totalPoints += 1;
      if (
        property.finishingType &&
        property.finishingType
          .toLowerCase()
          .includes(request.finishingType.toLowerCase())
      ) {
        matchedPoints += 1;
      }
    }

    // الإطلالة (وزن: 0.5)
    if (request.view) {
      totalPoints += 0.5;
      if (
        property.view &&
        property.view.toLowerCase().includes(request.view.toLowerCase())
      ) {
        matchedPoints += 0.5;
      }
    }

    // الاتجاه (وزن: 0.5)
    if (request.direction) {
      totalPoints += 0.5;
      if (
        property.direction &&
        property.direction
          .toLowerCase()
          .includes(request.direction.toLowerCase())
      ) {
        matchedPoints += 0.5;
      }
    }

    // حساب النسبة المئوية
    return totalPoints > 0
      ? Math.round((matchedPoints / totalPoints) * 100)
      : 0;
  }

  /**
   * تحديث حالة الطلب
   */
  async updateStatus(
    id: number,
    status: RequestStatus,
  ): Promise<PropertyRequest> {
    await this.findOne(id);
    return this.prisma.propertyRequest.update({
      where: { id },
      data: { status },
      include: {
        lead: true,
      },
    });
  }
}
