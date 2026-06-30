export { NotificationsModule } from './notifications.module';
export { NotificationsService } from './notifications.service';
export type {
  NotificationOptions,
  UserNotificationPreferences,
} from './notifications.service';

// Email exports
export { EmailModule, EmailService } from './email';
export type { EmailOptions } from './email';

// WhatsApp exports
export { WhatsAppModule, WhatsAppService } from './whatsapp';
export type { WhatsAppFileMessage, WhatsAppMessage } from './whatsapp';
