import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { WhatsAppService } from '../../notifications/whatsapp/whatsapp.service';
import { ClientsService } from './clients.service';
import { ClientQueryDto, CreateClientDto, UpdateClientDto } from './dto';

@Controller('accounting/clients')
@AutoAudit('CLIENT')
@Auth()
export class ClientsController {
  private readonly logger = new Logger(ClientsController.name);

  constructor(
    private readonly clientsService: ClientsService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClientDto: CreateClientDto) {
    this.logger.log('Creating new client');
    return this.clientsService.create(createClientDto);
  }

  @Get()
  async findAll(@Query() queryDto: ClientQueryDto) {
    this.logger.log('Getting all clients');
    return this.clientsService.findAll(queryDto);
  }

  @Get('search/quick')
  async searchClients(
    @Query('q') search: string,
    @Query('type') type?: 'CUSTOMER' | 'SUPPLIER',
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Quick search for clients: ${search}`);
    const parsedLimit = limit ? parseInt(limit, 10) : 15;
    return this.clientsService.searchClients(search, type, parsedLimit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting client with id: ${id}`);
    return this.clientsService.findOne(id);
  }

  @Get(':id/transactions')
  async getClientTransactions(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting transactions for client: ${id}`);
    return this.clientsService.getClientTransactions(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    this.logger.log(`Updating client with id: ${id}`);
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting client with id: ${id}`);
    return this.clientsService.remove(id);
  }

  @Post(':id/whatsapp')
  async sendWhatsAppToClient(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { message: string },
  ) {
    const client = await this.clientsService.findOne(id);
    if (!client.phone) {
      return { success: false, error: 'Client has no phone number' };
    }

    const success = await this.whatsAppService.sendTextMessage(
      client.phone,
      body.message,
    );
    return { success, clientId: id, sentTo: client.phone };
  }
}
