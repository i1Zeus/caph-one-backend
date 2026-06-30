import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const emailProvider = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'smtp',
    );

    if (emailProvider === 'gmail' || emailProvider === 'google-workspace') {
      this.createGoogleWorkspaceTransporter();
    } else {
      this.createGenericSMTPTransporter();
    }
  }

  private createGoogleWorkspaceTransporter() {
    const useOAuth2 = this.configService.get<boolean>(
      'GMAIL_USE_OAUTH2',
      false,
    );

    if (useOAuth2) {
      // OAuth2 configuration for Google Workspace
      const oauth2Config = {
        service: 'gmail',
        auth: {
          type: 'OAuth2' as const,
          user: this.configService.get<string>('GMAIL_USER'),
          clientId: this.configService.get<string>('GMAIL_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GMAIL_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
        },
      } as any;

      this.transporter = nodemailer.createTransport(oauth2Config);
      this.logger.log('Email transporter created with Google Workspace OAuth2');
    } else {
      // App Password configuration for Google Workspace
      const appPasswordConfig = {
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('GMAIL_USER'),
          pass: this.configService.get<string>('GMAIL_APP_PASSWORD'),
        },
      };

      this.transporter = nodemailer.createTransport(appPasswordConfig);
      this.logger.log(
        'Email transporter created with Google Workspace App Password',
      );
    }
  }

  private createGenericSMTPTransporter() {
    const emailConfig = {
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
    this.logger.log('Email transporter created with generic SMTP');
  }

  private generateTaskUrl(taskId?: string): string | null {
    if (!taskId) return null;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    return frontendUrl ? `${frontendUrl}/tasks/${taskId}` : null;
  }

  private generateTaskLinkHtml(taskId?: string): string {
    const taskUrl = this.generateTaskUrl(taskId);
    if (!taskUrl) return '';

    return `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${taskUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          View Task
        </a>
      </div>
    `;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const fromEmail =
        this.configService.get<string>('EMAIL_FROM') ||
        this.configService.get<string>('GMAIL_USER');
      const fromName = this.configService.get<string>(
        'EMAIL_FROM_NAME',
        'DevHouse ERP',
      );

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to}`,
        result.messageId,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to DevHouse ERP!</h2>
        <p>Hi ${userName},</p>
        <p>Welcome to our project management system. You can now access your dashboard and start collaborating with your team.</p>
        <p>Best regards,<br>DevHouse Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to DevHouse ERP',
      html: htmlContent,
    });
  }

  async sendUserInvitationEmail(
    to: string,
    userName: string,
    email: string,
    temporaryPassword: string,
    loginUrl?: string,
  ): Promise<boolean> {
    const defaultLoginUrl =
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173') +
      '/auth/login';
    const actualLoginUrl = loginUrl || defaultLoginUrl;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">DevHouse ERP</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Project Management System</p>
          </div>

          <h2 style="color: #1f2937; margin-bottom: 20px;">You're Invited to Join Our Team!</h2>

          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hi ${userName},</p>

          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            You've been invited to join DevHouse ERP! We're excited to have you on board and start collaborating on projects together.
          </p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Your Login Credentials:</h3>
            <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${temporaryPassword}</code></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${actualLoginUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Access Your Account
            </a>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Important:</strong> Please change your password after your first login for security reasons.
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            If you have any questions or need assistance, feel free to reach out to our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Best regards,<br>
            <strong>DevHouse Team</strong>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>If the button doesn't work, copy and paste this link: ${actualLoginUrl}</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: '🎉 Welcome to DevHouse ERP - Your Account is Ready!',
      html: htmlContent,
    });
  }

  async sendTaskAssignmentEmail(
    to: string,
    userName: string,
    taskTitle: string,
    projectName: string,
    taskId?: string,
  ): Promise<boolean> {
    const taskLinkHtml = this.generateTaskLinkHtml(taskId);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Task Assignment</h2>
        <p>Hi ${userName},</p>
        <p>You have been assigned a new task:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0;">${taskTitle}</h3>
          <p style="margin: 0;"><strong>Project:</strong> ${projectName}</p>
        </div>
        ${taskLinkHtml}
        <p>Please check your dashboard for more details and start working on the task.</p>
        <p>Best regards,<br>DevHouse Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `New Task Assignment: ${taskTitle}`,
      html: htmlContent,
    });
  }

  async sendTaskStatusUpdateEmail(
    to: string,
    userName: string,
    taskTitle: string,
    status: string,
    taskId?: string,
  ): Promise<boolean> {
    const taskLinkHtml = this.generateTaskLinkHtml(taskId);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Task Status Update</h2>
        <p>Hi ${userName},</p>
        <p>The status of your task has been updated:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0;">${taskTitle}</h3>
          <p style="margin: 0;"><strong>Status:</strong> ${status}</p>
        </div>
        ${taskLinkHtml}
        <p>Check your dashboard for more details.</p>
        <p>Best regards,<br>DevHouse Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Task Status Update: ${taskTitle}`,
      html: htmlContent,
    });
  }

  async generateCommentMentionEmailContent(
    userName: string,
    authorName: string,
    taskTitle: string,
    projectName: string,
    commentContent: string,
    taskId?: string,
  ): Promise<string> {
    const taskLinkHtml = this.generateTaskLinkHtml(taskId);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You were mentioned in a comment</h2>
        <p>Hi ${userName},</p>
        <p><strong>${authorName}</strong> mentioned you in a comment on the task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
          <p style="margin: 0; font-style: italic;">"${commentContent}"</p>
        </div>
        ${taskLinkHtml}
        <p>You can view the full task and respond to the comment using the link above or by logging into your dashboard.</p>
        <p>Best regards,<br>Your Project Management Team</p>
      </div>
    `;
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your DevHouse ERP account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Best regards,<br>DevHouse Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request',
      html: htmlContent,
    });
  }

  // Method to verify email configuration
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email service connection verification failed', error);
      return false;
    }
  }
}
