import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateInvoiceConfigDto, UpdateInvoiceConfigDto } from './dto';
import { InvoiceConfigsService } from './invoice-configs.service';

@Controller('accounting/invoice-configs')
export class InvoiceConfigsController {
  constructor(private readonly invoiceConfigsService: InvoiceConfigsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInvoiceConfigDto: CreateInvoiceConfigDto) {
    return this.invoiceConfigsService.create(createInvoiceConfigDto);
  }

  @Get()
  findAll() {
    return this.invoiceConfigsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceConfigsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInvoiceConfigDto: UpdateInvoiceConfigDto,
  ) {
    return this.invoiceConfigsService.update(+id, updateInvoiceConfigDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.invoiceConfigsService.remove(+id);
  }
}
