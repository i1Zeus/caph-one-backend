import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminOrganizationsService } from './admin-organizations.service';
import { AdminInvitationsController } from './admin-invitations.controller';
import { AdminInvitationsService } from './admin-invitations.service';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminOrganizationsController, AdminInvitationsController],
  providers: [
    AdminOrganizationsService,
    AdminInvitationsService,
    SuperAdminGuard,
  ],
  exports: [SuperAdminGuard],
})
export class AdminModule {}
