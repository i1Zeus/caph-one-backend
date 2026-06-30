import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { LockPosDto, PosAuthDto, UnlockPosDto } from './dto';
import { PosAuthService } from './pos-auth.service';

@Controller('pos/auth')
export class PosAuthController {
  constructor(private readonly posAuthService: PosAuthService) {}

  @Post('login')
  async login(@Body() dto: PosAuthDto) {
    return this.posAuthService.authenticateWithPin(dto.employeeId, dto.pin);
  }

  @Post('lock/:posId')
  async lockPOS(
    @Param('posId', ParseIntPipe) posId: number,
    @Body() dto: LockPosDto,
  ) {
    return this.posAuthService.lockPOS(posId, dto.employeeId);
  }

  @Post('unlock/:posId')
  async unlockPOS(
    @Param('posId', ParseIntPipe) posId: number,
    @Body() dto: UnlockPosDto,
  ) {
    return this.posAuthService.unlockPOS(posId, dto.employeeId, dto.pin);
  }

  @Get('status/:posId')
  async getStatus(@Param('posId', ParseIntPipe) posId: number) {
    return this.posAuthService.isPOSLocked(posId);
  }
}
