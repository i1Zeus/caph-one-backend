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
  Res,
} from '@nestjs/common';
import { ContractStatus } from '@prisma/client';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { ContractPdfService } from './contract-pdf.service';
import { CreatePropertyContractDto, UpdatePropertyContractDto } from './dto';
import { PropertyContractService } from './property-contract.service';

@Controller('crm/property-contracts')
@AutoAudit('Real Estate - Contracts')
export class PropertyContractController {
  constructor(
    private readonly propertyContractService: PropertyContractService,
    private readonly contractPdfService: ContractPdfService,
  ) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPropertyContractDto: CreatePropertyContractDto) {
    return this.propertyContractService.create(createPropertyContractDto);
  }

  @Get()
  @Auth()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('leadId') leadId?: string,
    @Query('status') status?: ContractStatus,
    @Query('contractType') contractType?: string,
  ) {
    const filters: any = {};
    if (propertyId) filters.propertyId = parseInt(propertyId);
    if (leadId) filters.leadId = leadId;
    if (status) filters.status = status;
    if (contractType) filters.contractType = contractType;

    return this.propertyContractService.findAll(filters);
  }

  @Get('statistics')
  @Auth()
  async getStatistics() {
    return this.propertyContractService.getStatistics();
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertyContractService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyContractDto: UpdatePropertyContractDto,
  ) {
    return this.propertyContractService.update(id, updatePropertyContractDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.propertyContractService.remove(id);
  }

  @Post(':id/activate')
  @Auth()
  async activateContract(@Param('id', ParseIntPipe) id: number) {
    return this.propertyContractService.activateContract(id);
  }

  @Post(':id/complete')
  @Auth()
  async completeContract(@Param('id', ParseIntPipe) id: number) {
    return this.propertyContractService.completeContract(id);
  }

  @Post(':id/cancel')
  @Auth()
  async cancelContract(@Param('id', ParseIntPipe) id: number) {
    return this.propertyContractService.cancelContract(id);
  }

  @Get(':id/pdf')
  async downloadContractPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: any,
  ) {
    const pdfBuffer = await this.contractPdfService.generateContractPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}
