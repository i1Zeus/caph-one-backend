import * as whatsAppClient from '@green-api/whatsapp-api-client';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatPhoneNumberForWhatsApp } from '../../../utils/help';

export interface WhatsAppMessage {
  to: string; // Phone number with country code
  message: string;
  type?: 'text' | 'file' | 'image';
  fileName?: string;
  fileUrl?: string;
}

export interface WhatsAppFileMessage extends WhatsAppMessage {
  type: 'file' | 'image';
  fileName: string;
  fileUrl: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: any;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;

  constructor(private configService: ConfigService) {
    this.idInstance = this.configService.get<string>('GREENAPI_ID_INSTANCE');
    this.apiTokenInstance =
      this.configService.get<string>('GREENAPI_API_TOKEN');

    if (!this.idInstance || !this.apiTokenInstance) {
      this.logger.warn(
        'Green API credentials not found. WhatsApp service will not be functional.',
      );
      this.logger.warn(
        'Please set GREENAPI_ID_INSTANCE and GREENAPI_API_TOKEN in your environment variables.',
      );
      return;
    }

    this.client = whatsAppClient.restAPI({
      idInstance: this.idInstance,
      apiTokenInstance: this.apiTokenInstance,
    });
  }

  private generateTaskUrl(taskId?: string): string | null {
    if (!taskId) return null;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return frontendUrl ? `${frontendUrl}/tasks/${taskId}` : null;
  }

  private formatTaskLink(taskId?: string): string {
    const taskUrl = this.generateTaskUrl(taskId);
    return taskUrl ? `\n\n🔗 View Task: ${taskUrl}` : '';
  }

  async sendTextMessage(to: string, message: string): Promise<boolean> {
    if (!this.client) {
      this.logger.error(
        'WhatsApp client not initialized. Check your Green API credentials.',
      );
      return false;
    }

    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(to);

      const response = await this.client.message.sendMessage(
        formattedNumber,
        null,
        message,
      );

      if (response.idMessage) {
        this.logger.log(
          `WhatsApp message sent successfully to ${to}`,
          response.idMessage,
        );
        return true;
      } else {
        this.logger.error(`Failed to send WhatsApp message to ${to}`, response);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${to}`, error);
      return false;
    }
  }

  async sendFileMessage(
    to: string,
    fileUrl: string,
    fileName: string,
    caption?: string,
  ): Promise<boolean> {
    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(to);

      const response = await this.client.file.sendFileByUrl(
        formattedNumber,
        null,
        fileUrl,
        fileName,
        caption || '',
      );

      if (response.idMessage) {
        this.logger.log(
          `WhatsApp file sent successfully to ${to}`,
          response.idMessage,
        );
        return true;
      } else {
        this.logger.error(`Failed to send WhatsApp file to ${to}`, response);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp file to ${to}`, error);
      return false;
    }
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<boolean> {
    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(to);

      const response = await this.client.file.sendFileByUrl(
        formattedNumber,
        null,
        imageUrl,
        'image.jpg',
        caption || '',
      );

      if (response.idMessage) {
        this.logger.log(
          `WhatsApp image sent successfully to ${to}`,
          response.idMessage,
        );
        return true;
      } else {
        this.logger.error(`Failed to send WhatsApp image to ${to}`, response);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp image to ${to}`, error);
      return false;
    }
  }

  async sendWelcomeMessage(to: string, userName: string): Promise<boolean> {
    const message = `Welcome to DevHouse ERP, ${userName}! 🎉

Thank you for joining our project management system. You can now:

📊 Access your dashboard
👥 Collaborate with your team
📋 Manage projects and tasks
📈 Track progress in real-time

Get started by logging into your account.

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async sendUserInvitationMessage(
    to: string,
    userName: string,
    email: string,
    temporaryPassword: string,
    loginUrl?: string,
  ): Promise<boolean> {
    // Get default login URL if not provided
    const defaultLoginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const actualLoginUrl = loginUrl || `${defaultLoginUrl}/auth/login`;

    const message = `🎉 *Welcome to DevHouse ERP!*

Hi ${userName},

You've been invited to join our project management team! We're excited to have you on board.

📋 *Your Login Credentials:*
✉️ Email: ${email}
🔑 Password: \`${temporaryPassword}\`

🔗 *Login Here:*
${actualLoginUrl}

⚠️ *Important:* Please change your password after your first login for security.

📱 With DevHouse ERP you can:
• 📊 Manage projects and tasks
• 👥 Collaborate with team members
• 📈 Track progress in real-time
• 💬 Communicate efficiently

Need help? Just reply to this message!

Best regards,
*DevHouse Team* 🏢`;

    return this.sendTextMessage(to, message);
  }

  async sendTaskAssignmentMessage(
    to: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    taskId?: string,
  ): Promise<boolean> {
    const taskLink = this.formatTaskLink(taskId);

    const message = `📋 New Task Assignment

Hi ${userName}! 👋

You have been assigned a new task:

*Task:* ${taskTitle}
*Project:* ${projectName}

Please check your dashboard for more details and start working on it.${taskLink}

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async sendTaskStatusUpdate(
    to: string,
    userName: string,
    taskTitle: string,
    status: string,
    taskId?: string,
  ): Promise<boolean> {
    const taskLink = this.formatTaskLink(taskId);

    const message = `📊 Task Status Update

Hi ${userName}! 👋

Task status has been updated:

*Task:* ${taskTitle}
*Status:* ${status}

Check your dashboard for more details.${taskLink}

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async generateCommentMentionMessage(
    userName: string,
    authorName: string,
    taskTitle: string,
    projectName: string,
    commentContent: string,
    taskId?: string,
  ): Promise<string> {
    const taskLink = this.formatTaskLink(taskId);

    return `💬 You were mentioned in a comment

Hi ${userName}! 👋

${authorName} mentioned you in a comment on task "${taskTitle}" in project "${projectName}":

"${commentContent}"

Check your dashboard to view and respond to the comment.${taskLink}`;
  }

  async sendProjectUpdate(
    to: string,
    userName: string,
    projectName: string,
    updateMessage: string,
  ): Promise<boolean> {
    const message = `📢 Project Update

Hi ${userName}! 👋

There's an update on your project:

*Project:* ${projectName}

${updateMessage}

Check your dashboard for full details.

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async sendReminder(
    to: string,
    userName: string,
    reminderMessage: string,
  ): Promise<boolean> {
    const message = `⏰ Reminder

Hi ${userName}! 👋

${reminderMessage}

Don't forget to check your dashboard for updates.

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async sendTaskDeadlineReminder(
    to: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    deadline: string,
    taskId?: string,
  ): Promise<boolean> {
    const taskLink = this.formatTaskLink(taskId);

    const message = `⚠️ Task Deadline Reminder

Hi ${userName}! 👋

Your task is approaching its deadline:

*Task:* ${taskTitle}
*Project:* ${projectName}
*Deadline:* ${deadline}

Please complete the task before the deadline.${taskLink}

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async sendProjectMilestoneUpdate(
    to: string,
    userName: string,
    projectName: string,
    milestoneName: string,
  ): Promise<boolean> {
    const message = `🎯 Milestone Achieved!

Hi ${userName}! 👋

Great news! A milestone has been reached:

*Project:* ${projectName}
*Milestone:* ${milestoneName}

Congratulations on the progress! 🎉

Best regards,
DevHouse Team`;

    return this.sendTextMessage(to, message);
  }

  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.settings.getSettings();
      return response;
    } catch (error) {
      this.logger.error('Failed to get WhatsApp account info', error);
      return null;
    }
  }

  async checkWhatsAppStatus(): Promise<boolean> {
    if (!this.client) {
      this.logger.error(
        'WhatsApp client not initialized. Check your Green API credentials.',
      );
      return false;
    }

    try {
      const response = await this.client.settings.getStateInstance();
      return response.stateInstance === 'authorized';
    } catch (error) {
      this.logger.error('Failed to check WhatsApp status', error);
      return false;
    }
  }

  async getQrCode(): Promise<string | null> {
    try {
      const response = await this.client.settings.getQrCode();
      return response.message;
    } catch (error) {
      this.logger.error('Failed to get QR code', error);
      return null;
    }
  }

  async logoutInstance(): Promise<boolean> {
    try {
      const response = await this.client.settings.logout();
      return response.isLoggedOut === true;
    } catch (error) {
      this.logger.error('Failed to logout WhatsApp instance', error);
      return false;
    }
  }

  async rebootInstance(): Promise<boolean> {
    try {
      const response = await this.client.settings.reboot();
      return response.reboot === true;
    } catch (error) {
      this.logger.error('Failed to reboot WhatsApp instance', error);
      return false;
    }
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    address?: string,
  ): Promise<boolean> {
    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(to);

      const response = await this.client.message.sendLocation(
        formattedNumber,
        null,
        latitude,
        longitude,
        address || 'Shared Location',
      );

      if (response.idMessage) {
        this.logger.log(
          `WhatsApp location sent successfully to ${to}`,
          response.idMessage,
        );
        return true;
      } else {
        this.logger.error(
          `Failed to send WhatsApp location to ${to}`,
          response,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp location to ${to}`, error);
      return false;
    }
  }

  async sendContact(
    to: string,
    contactData: { name: string; phone: string; email?: string },
  ): Promise<boolean> {
    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(to);

      const contact = {
        name: {
          first_name: contactData.name,
        },
        phones: [
          {
            phone: contactData.phone,
            type: 'MAIN',
          },
        ],
        emails: contactData.email
          ? [
              {
                email: contactData.email,
                type: 'WORK',
              },
            ]
          : [],
      };

      const response = await this.client.message.sendContact(
        formattedNumber,
        null,
        contact,
      );

      if (response.idMessage) {
        this.logger.log(
          `WhatsApp contact sent successfully to ${to}`,
          response.idMessage,
        );
        return true;
      } else {
        this.logger.error(`Failed to send WhatsApp contact to ${to}`, response);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp contact to ${to}`, error);
      return false;
    }
  }

  async getMessageHistory(chatId: string, count: number = 20): Promise<any[]> {
    try {
      const response = await this.client.journals.getChatHistory(chatId, count);
      return response || [];
    } catch (error) {
      this.logger.error(`Failed to get message history for ${chatId}`, error);
      return [];
    }
  }

  async isPhoneNumberOnWhatsApp(phoneNumber: string): Promise<boolean> {
    try {
      const formattedNumber = formatPhoneNumberForWhatsApp(phoneNumber);
      const response = await this.client.service.checkWhatsapp(formattedNumber);
      return response.existsWhatsapp === true;
    } catch (error) {
      this.logger.error(
        `Failed to check if phone number ${phoneNumber} is on WhatsApp`,
        error,
      );
      return false;
    }
  }
}
