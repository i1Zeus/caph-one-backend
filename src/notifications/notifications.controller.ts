import { Body, Controller, Get, Post } from '@nestjs/common';
import { EmailService } from './email/email.service';
import {
  NotificationsService,
  UserNotificationPreferences,
} from './notifications.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';

interface TestEmailDto {
  to: string;
  subject?: string;
  message?: string;
}

interface TestTaskNotificationDto {
  to: string;
  phone?: string;
  userName: string;
  taskTitle: string;
  projectName: string;
  taskId?: string;
  type: 'assignment' | 'status_update' | 'comment_mention';
  status?: string;
  authorName?: string;
  commentContent?: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('whatsapp')
  async sendWhatsAppMessage() {
    return this.whatsAppService.sendTextMessage(
      '+9647736000954',
      'Hello, this is a test message!',
    );
  }

  @Get('email/verify')
  async verifyEmailConnection() {
    const isWorking = await this.emailService.verifyConnection();
    return {
      success: isWorking,
      message: isWorking
        ? 'Email service is configured correctly and working!'
        : 'Email service configuration has issues. Check your environment variables and logs.',
    };
  }

  @Post('email/test')
  async sendTestEmail(@Body() testData: TestEmailDto) {
    const subject = testData.subject || 'Test Email from iZeus ERP';
    const message =
      testData.message ||
      'This is a test email to verify your Google Workspace configuration is working correctly.';

    const sent = await this.emailService.sendEmail({
      to: testData.to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>${message}</p>
          <p><strong>✅ Your Google Workspace email configuration is working correctly!</strong></p>
          <hr>
          <p><small>Sent from iZeus ERP Email Service</small></p>
        </div>
      `,
    });

    return {
      success: sent,
      message: sent
        ? `Test email sent successfully to ${testData.to}`
        : `Failed to send test email to ${testData.to}. Check logs for details.`,
    };
  }

  @Post('task/test')
  async sendTestTaskNotification(@Body() testData: TestTaskNotificationDto) {
    const preferences: UserNotificationPreferences = {
      email: true,
      whatsapp: !!testData.phone,
      emailAddress: testData.to,
      phoneNumber: testData.phone,
    };

    let result;

    switch (testData.type) {
      case 'assignment':
        result = await this.notificationsService.sendTaskAssignmentNotification(
          testData.userName,
          testData.taskTitle,
          testData.projectName,
          preferences,
          testData.taskId,
        );
        break;

      case 'status_update':
        result =
          await this.notificationsService.sendTaskStatusUpdateNotification(
            testData.userName,
            testData.taskTitle,
            testData.status || 'Completed',
            preferences,
            testData.taskId,
          );
        break;

      case 'comment_mention':
        result = await this.notificationsService.sendCommentMentionNotification(
          testData.userName,
          testData.authorName || 'John Doe',
          testData.taskTitle,
          testData.projectName,
          testData.commentContent || 'This is a test comment mention.',
          preferences,
          testData.taskId,
        );
        break;

      default:
        return {
          success: false,
          message:
            'Invalid notification type. Use: assignment, status_update, or comment_mention',
        };
    }

    return {
      success: result.email || result.whatsapp,
      details: result,
      message: `Task ${testData.type} notification sent successfully!`,
    };
  }
}
