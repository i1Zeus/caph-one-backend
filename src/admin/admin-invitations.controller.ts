import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminInvitationsService } from './admin-invitations.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class AdminInvitationsController {
  constructor(private readonly service: AdminInvitationsService) {}

  @Post('organizations/:orgId/invite')
  invite(@Param('orgId') orgId: string, @Body() dto: InviteUserDto) {
    return this.service.invite(orgId, dto);
  }

  @Get('invitations')
  findAll() {
    return this.service.findAll();
  }

  @Delete('invitations/:id')
  revoke(@Param('id') id: string) {
    return this.service.revoke(id);
  }
}
