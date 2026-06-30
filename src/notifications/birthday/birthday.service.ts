import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class BirthdayService {
  private readonly logger = new Logger(BirthdayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {
    this.logger.log(
      '🎂 Birthday greeting cron job registered (daily at 9:00 AM Baghdad time)',
    );
  }

  /**
   * Runs daily at 9:00 AM Baghdad time (UTC+3 = 6:00 AM UTC)
   * Checks for leads and clients with birthdays today and sends WhatsApp greetings
   */
  @Cron('0 6 * * *') // 6:00 AM UTC = 9:00 AM Baghdad (UTC+3)
  async handleBirthdayGreetings() {
    this.logger.log('🎂 Running birthday greeting check...');

    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate(); // 1-31

    try {
      // Find leads with birthdays today
      const leadsWithBirthday = await this.findLeadsWithBirthdayToday(
        currentMonth,
        currentDay,
      );

      // Find clients with birthdays today
      const clientsWithBirthday = await this.findClientsWithBirthdayToday(
        currentMonth,
        currentDay,
      );

      const totalBirthdays =
        leadsWithBirthday.length + clientsWithBirthday.length;

      if (totalBirthdays === 0) {
        this.logger.log('🎂 No birthdays today');
        return;
      }

      this.logger.log(
        `🎂 Found ${totalBirthdays} birthdays today (${leadsWithBirthday.length} leads, ${clientsWithBirthday.length} clients)`,
      );

      // Send greetings to leads
      for (const lead of leadsWithBirthday) {
        if (lead.phone) {
          try {
            await this.whatsAppService.sendBirthdayGreeting(
              lead.phone,
              lead.name,
            );
            this.logger.log(
              `🎂 Birthday greeting sent to lead: ${lead.name} (${lead.phone})`,
            );
          } catch (error) {
            this.logger.error(
              `🎂 Failed to send birthday greeting to lead: ${lead.name}`,
              error,
            );
          }
        }
      }

      // Send greetings to clients
      for (const client of clientsWithBirthday) {
        if (client.phone) {
          try {
            await this.whatsAppService.sendBirthdayGreeting(
              client.phone,
              client.name,
            );
            this.logger.log(
              `🎂 Birthday greeting sent to client: ${client.name} (${client.phone})`,
            );
          } catch (error) {
            this.logger.error(
              `🎂 Failed to send birthday greeting to client: ${client.name}`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `🎂 Birthday greeting process completed. Sent to ${totalBirthdays} contacts.`,
      );
    } catch (error) {
      this.logger.error('🎂 Birthday greeting check failed', error);
    }
  }

  /**
   * Find all leads whose dateOfBirth month and day match today
   */
  private async findLeadsWithBirthdayToday(month: number, day: number) {
    // Use raw SQL to extract month and day from dateOfBirth
    const leads = await this.prisma.$queryRaw<
      Array<{ id: string; name: string; phone: string | null }>
    >`
      SELECT id, name, phone 
      FROM "Lead" 
      WHERE "dateOfBirth" IS NOT NULL 
        AND "isDeleted" = false
        AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
        AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
        AND phone IS NOT NULL
    `;
    return leads;
  }

  /**
   * Find all clients whose dateOfBirth month and day match today
   */
  private async findClientsWithBirthdayToday(month: number, day: number) {
    const clients = await this.prisma.$queryRaw<
      Array<{ id: number; name: string; phone: string | null }>
    >`
      SELECT id, name, phone
      FROM "clients" 
      WHERE "dateOfBirth" IS NOT NULL 
        AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
        AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
        AND phone IS NOT NULL
    `;
    return clients;
  }
}
