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
  Query,
} from '@nestjs/common';
import { CreateReceiptDto, FilterReceiptsDto, UpdateReceiptDto } from './dto';
import { ReceiptsService } from './receipts.service';

@Controller('accounting/receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReceipt(@Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.createReceipt(createReceiptDto);
  }

  @Get()
  async findAll(@Query() filterDto: FilterReceiptsDto) {
    return this.receiptsService.findAll(filterDto);
  }

  @Get('receipts')
  async findReceipts(@Query() filterDto: FilterReceiptsDto) {
    return this.receiptsService.findReceipts(filterDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.receiptsService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateReceiptDto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(+id, updateReceiptDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.receiptsService.remove(+id);
  }
}
