import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';

export interface NotificationOptions {
  email?: {
    enabled: boolean;
    to: string | string[];
  };
  whatsapp?: {
    enabled: boolean;
    to: string | string[];
  };
}

export interface UserNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  emailAddress?: string;
  phoneNumber?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async sendWelcomeNotification(
    userName: string,
    preferences: UserNotificationPreferences,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send email notification
    if (preferences.email && preferences.emailAddress) {
      try {
        results.email = await this.emailService.sendWelcomeEmail(
          preferences.emailAddress,
          userName,
        );
      } catch (error) {
        this.logger.error('Failed to send welcome email', error);
      }
    }

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendWelcomeMessage(
          preferences.phoneNumber,
          userName,
        );
      } catch (error) {
        this.logger.error('Failed to send welcome WhatsApp message', error);
      }
    }

    return results;
  }

  async sendUserInvitationNotification(
    userName: string,
    email: string,
    temporaryPassword: string,
    preferences: UserNotificationPreferences,
    loginUrl?: string,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send email invitation
    if (preferences.email && preferences.emailAddress) {
      try {
        results.email = await this.emailService.sendUserInvitationEmail(
          preferences.emailAddress,
          userName,
          email,
          temporaryPassword,
          loginUrl,
        );
        this.logger.log(`Invitation email sent to ${preferences.emailAddress}`);
      } catch (error) {
        this.logger.error('Failed to send invitation email', error);
      }
    }

    // Send WhatsApp invitation
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendUserInvitationMessage(
          preferences.phoneNumber,
          userName,
          email,
          temporaryPassword,
          loginUrl,
        );
        this.logger.log(
          `Invitation WhatsApp message sent to ${preferences.phoneNumber}`,
        );
      } catch (error) {
        this.logger.error('Failed to send invitation WhatsApp message', error);
      }
    }

    return results;
  }

  async sendTaskAssignmentNotification(
    userName: string,
    taskTitle: string,
    projectName: string,
    preferences: UserNotificationPreferences,
    taskId?: string,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send email notification
    if (preferences.email && preferences.emailAddress) {
      try {
        results.email = await this.emailService.sendTaskAssignmentEmail(
          preferences.emailAddress,
          userName,
          taskTitle,
          projectName,
          taskId,
        );
      } catch (error) {
        this.logger.error('Failed to send task assignment email', error);
      }
    }

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendTaskAssignmentMessage(
          preferences.phoneNumber,
          userName,
          taskTitle,
          projectName,
          taskId,
        );
      } catch (error) {
        this.logger.error(
          'Failed to send task assignment WhatsApp message',
          error,
        );
      }
    }

    return results;
  }

  async sendTaskStatusUpdateNotification(
    userName: string,
    taskTitle: string,
    status: string,
    preferences: UserNotificationPreferences,
    taskId?: string,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send email notification
    if (preferences.email && preferences.emailAddress) {
      try {
        results.email = await this.emailService.sendTaskStatusUpdateEmail(
          preferences.emailAddress,
          userName,
          taskTitle,
          status,
          taskId,
        );
      } catch (error) {
        this.logger.error('Failed to send task status update email', error);
      }
    }

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendTaskStatusUpdate(
          preferences.phoneNumber,
          userName,
          taskTitle,
          status,
          taskId,
        );
      } catch (error) {
        this.logger.error(
          'Failed to send task status update WhatsApp message',
          error,
        );
      }
    }

    return results;
  }

  async sendPasswordResetNotification(
    emailAddress: string,
    resetToken: string,
  ): Promise<boolean> {
    try {
      return await this.emailService.sendPasswordResetEmail(
        emailAddress,
        resetToken,
      );
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
      return false;
    }
  }

  async sendProjectUpdateNotification(
    userName: string,
    projectName: string,
    updateMessage: string,
    preferences: UserNotificationPreferences,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendProjectUpdate(
          preferences.phoneNumber,
          userName,
          projectName,
          updateMessage,
        );
      } catch (error) {
        this.logger.error(
          'Failed to send project update WhatsApp message',
          error,
        );
      }
    }

    return results;
  }

  async sendReminderNotification(
    userName: string,
    reminderMessage: string,
    preferences: UserNotificationPreferences,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendReminder(
          preferences.phoneNumber,
          userName,
          reminderMessage,
        );
      } catch (error) {
        this.logger.error('Failed to send reminder WhatsApp message', error);
      }
    }

    return results;
  }

  async sendCommentMentionNotification(
    userName: string,
    authorName: string,
    taskTitle: string,
    projectName: string,
    commentContent: string,
    preferences: UserNotificationPreferences,
    taskId?: string,
  ): Promise<{ email: boolean; whatsapp: boolean }> {
    const results = { email: false, whatsapp: false };

    const emailSubject = `You were mentioned in a comment on "${taskTitle}"`;
    const emailBody =
      await this.emailService.generateCommentMentionEmailContent(
        userName,
        authorName,
        taskTitle,
        projectName,
        commentContent,
        taskId,
      );

    const whatsappMessage =
      await this.whatsAppService.generateCommentMentionMessage(
        userName,
        authorName,
        taskTitle,
        projectName,
        commentContent,
        taskId,
      );

    // Send email notification
    if (preferences.email && preferences.emailAddress) {
      try {
        results.email = await this.emailService.sendEmail({
          to: preferences.emailAddress,
          subject: emailSubject,
          html: emailBody,
        });
      } catch (error) {
        this.logger.error('Failed to send comment mention email', error);
      }
    }

    // Send WhatsApp notification
    if (preferences.whatsapp && preferences.phoneNumber) {
      try {
        results.whatsapp = await this.whatsAppService.sendTextMessage(
          preferences.phoneNumber,
          whatsappMessage,
        );
      } catch (error) {
        this.logger.error(
          'Failed to send comment mention WhatsApp message',
          error,
        );
      }
    }

    return results;
  }

  async sendCustomEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    try {
      return await this.emailService.sendEmail({
        to,
        subject,
        html: htmlContent,
      });
    } catch (error) {
      this.logger.error('Failed to send custom email', error);
      return false;
    }
  }

  async sendCustomWhatsAppMessage(
    to: string | string[],
    message: string,
  ): Promise<boolean> {
    try {
      if (Array.isArray(to)) {
        const results = await Promise.all(
          to.map((number) =>
            this.whatsAppService.sendTextMessage(number, message),
          ),
        );
        return results.every((result) => result);
      } else {
        return await this.whatsAppService.sendTextMessage(to, message);
      }
    } catch (error) {
      this.logger.error('Failed to send custom WhatsApp message', error);
      return false;
    }
  }

  async checkNotificationServicesStatus(): Promise<{
    email: boolean;
    whatsapp: boolean;
  }> {
    const results = { email: false, whatsapp: false };

    try {
      // Check email service (basic check - try to create transporter)
      results.email = true; // Email service doesn't have a specific status check
    } catch (error) {
      this.logger.error('Email service is not available', error);
    }

    try {
      // Check WhatsApp service status
      results.whatsapp = await this.whatsAppService.checkWhatsAppStatus();
    } catch (error) {
      this.logger.error('WhatsApp service is not available', error);
    }

    return results;
  }
}
