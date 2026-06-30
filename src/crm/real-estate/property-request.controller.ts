import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import {
  CreatePropertyRequestDto,
  SearchPropertiesDto,
  UpdatePropertyRequestDto,
} from './dto';
import { PropertyRequestService } from './property-request.service';

@Controller('crm/property-requests')
@AutoAudit('Real Estate - Property Requests')
export class PropertyRequestController {
  constructor(
    private readonly propertyRequestService: PropertyRequestService,
  ) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPropertyRequestDto: CreatePropertyRequestDto) {
    return this.propertyRequestService.create(createPropertyRequestDto);
  }

  @Get()
  @Auth()
  findAll(
    @Query('leadId') leadId?: string,
    @Query('status') status?: RequestStatus,
    @Query('propertyType') propertyType?: string,
    @Query('city') city?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.userId || req?.user?.sub;
    const permissions = req?.user?.permissions || [];
    const isAdmin = permissions.includes('admin:all');

    return this.propertyRequestService.findAll(
      {
        leadId,
        status,
        propertyType,
        city,
      },
      userId,
      isAdmin,
    );
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertyRequestService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyRequestDto: UpdatePropertyRequestDto,
  ) {
    return this.propertyRequestService.update(id, updatePropertyRequestDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertyRequestService.remove(id);
  }

  /**
   * البحث عن عقارات مطابقة لطلب معين
   * GET /property-requests/:id/search-matching
   */
  @Get(':id/search-matching')
  @Auth()
  searchMatchingProperties(
    @Param('id', ParseIntPipe) id: number,
    @Query() searchDto: SearchPropertiesDto,
  ) {
    return this.propertyRequestService.searchMatchingProperties(id, searchDto);
  }

  /**
   * تحديث حالة الطلب
   * PATCH /property-requests/:id/status
   */
  @Patch(':id/status')
  @Auth()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: RequestStatus,
  ) {
    return this.propertyRequestService.updateStatus(id, status);
  }
}
