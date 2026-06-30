import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, EmailModule, WhatsAppModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService, EmailModule, WhatsAppModule],
})
export class NotificationsModule {}
