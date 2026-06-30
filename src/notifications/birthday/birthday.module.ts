import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { BirthdayService } from './birthday.service';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  providers: [BirthdayService],
  exports: [BirthdayService],
})
export class BirthdayModule {}
