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
} from '@nestjs/common';
import { InvoiceTemplateType } from '@prisma/client';
import { Auth } from '../../auth';
import { CreateInvoiceTemplateDto, UpdateInvoiceTemplateDto } from './dto';
import { InvoiceTemplatesService } from './invoice-templates.service';

@Controller('accounting/invoice-templates')
@Auth()
export class InvoiceTemplatesController {
  constructor(
    private readonly invoiceTemplatesService: InvoiceTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInvoiceTemplateDto: CreateInvoiceTemplateDto) {
    return this.invoiceTemplatesService.create(createInvoiceTemplateDto);
  }

  @Get()
  findAll() {
    return this.invoiceTemplatesService.findAll();
  }

  @Get('type/:type')
  findByType(@Param('type') type: InvoiceTemplateType) {
    return this.invoiceTemplatesService.findByType(type);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceTemplatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceTemplateDto: UpdateInvoiceTemplateDto,
  ) {
    return this.invoiceTemplatesService.update(id, updateInvoiceTemplateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceTemplatesService.remove(id);
  }
}
