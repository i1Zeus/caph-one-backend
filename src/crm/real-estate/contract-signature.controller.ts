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
} from '@nestjs/common';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { ContractSignatureService } from './contract-signature.service';
import { CreateContractSignatureDto, UpdateContractSignatureDto } from './dto';

@Controller('crm/contract-signatures')
@AutoAudit('Real Estate - Contract Signatures')
export class ContractSignatureController {
  constructor(private readonly signatureService: ContractSignatureService) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSignatureDto: CreateContractSignatureDto) {
    return this.signatureService.create(createSignatureDto);
  }

  @Get()
  @Auth()
  async findAll(@Query('contractId') contractId?: string) {
    const filters = contractId ? parseInt(contractId) : undefined;
    return this.signatureService.findAll(filters);
  }

  @Get('contract/:contractId')
  @Auth()
  async getContractSignatures(
    @Param('contractId', ParseIntPipe) contractId: number,
  ) {
    return this.signatureService.getContractSignatures(contractId);
  }

  @Get('contract/:contractId/can-complete')
  @Auth()
  async canCompleteContract(
    @Param('contractId', ParseIntPipe) contractId: number,
  ) {
    const canComplete =
      await this.signatureService.canCompleteContract(contractId);
    return { canComplete };
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.signatureService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSignatureDto: UpdateContractSignatureDto,
  ) {
    return this.signatureService.update(id, updateSignatureDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.signatureService.remove(id);
  }
}
