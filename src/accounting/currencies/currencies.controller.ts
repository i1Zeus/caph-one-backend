import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto';

@Controller('accounting/currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  create(@Body() createCurrencyDto: CreateCurrencyDto) {
    return this.currenciesService.create(createCurrencyDto);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    if (active === 'true') {
      return this.currenciesService.findActive();
    }
    return this.currenciesService.findAll();
  }

  @Get('main')
  findMain() {
    return this.currenciesService.findMain();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.currenciesService.findOne(id);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.currenciesService.findByCode(code);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(id, updateCurrencyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.currenciesService.remove(id);
  }

  @Post('convert')
  convertAmount(
    @Body()
    convertDto: {
      amount: number;
      fromCurrencyId: number;
      toCurrencyId: number;
    },
  ) {
    return this.currenciesService.convertAmount(
      convertDto.amount,
      convertDto.fromCurrencyId,
      convertDto.toCurrencyId,
    );
  }

  @Patch('exchange-rates')
  updateExchangeRates(
    @Body() ratesDto: { rates: { currencyId: number; rate: number }[] },
  ) {
    return this.currenciesService.updateExchangeRates(ratesDto.rates);
  }

  @Get(':id/stats')
  getCurrencyStats(@Param('id', ParseIntPipe) id: number) {
    return this.currenciesService.getCurrencyStats(id);
  }

  @Get('stats/all')
  getAllCurrencyStats() {
    return this.currenciesService.getAllCurrencyStats();
  }
}
