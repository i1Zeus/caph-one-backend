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
import { CreatePaymentDto, FilterPaymentsDto, UpdatePaymentDto } from './dto';
import { PaymentsService } from './payments.service';

@Controller('accounting/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get()
  async findAll(@Query() filterDto: FilterPaymentsDto) {
    return this.paymentsService.findAll(filterDto);
  }

  @Get('payments')
  async findPayments(@Query() filterDto: FilterPaymentsDto) {
    return this.paymentsService.findPayments(filterDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
