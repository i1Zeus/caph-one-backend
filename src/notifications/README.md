# Notification Services

This module provides email and WhatsApp notification services for the DevHouse ERP system.

## Features

- **Email Notifications** using Nodemailer
- **WhatsApp Notifications** using Official Green API Client (`@green-api/whatsapp-api-client`)
- Unified notification service that handles both channels
- Pre-built templates for common notifications
- Advanced WhatsApp features (locations, contacts, file sharing)
- TypeScript support with proper type definitions

## Setup

### Dependencies

The following packages are automatically installed:

- `@nestjs/config` - Configuration management
- `nodemailer` - Email service
- `@green-api/whatsapp-api-client` - Official Green API WhatsApp client
- `@types/nodemailer` - TypeScript definitions for nodemailer

### Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your_email@gmail.com"
EMAIL_PASSWORD="your_app_password"
EMAIL_FROM="your_email@gmail.com"

# WhatsApp Configuration (Green API)
GREENAPI_ID_INSTANCE="your_green_api_instance_id"
GREENAPI_API_TOKEN="your_green_api_token"

# Frontend URL (for reset links)
FRONTEND_URL="http://localhost:5173"
```

### Email Setup (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App passwords
3. Use the App Password as `EMAIL_PASSWORD`

### WhatsApp Setup (Green API)

1. Sign up at [green-api.com](https://green-api.com)
2. Create a new instance
3. Get your `idInstance` and `apiTokenInstance`
4. Scan QR code to connect your WhatsApp account
5. Use the official Green API client for better integration

## Module Integration

Import the NotificationsModule in your app module:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationsModule,
    // ... other modules
  ],
})
export class AppModule {}
```

## Usage Examples

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import {
  NotificationsService,
  UserNotificationPreferences,
} from './notifications';

@Injectable()
export class UserService {
  constructor(private notificationsService: NotificationsService) {}

  async createUser(userData: any) {
    // ... create user logic

    // Send welcome notification
    const preferences: UserNotificationPreferences = {
      email: true,
      whatsapp: true,
      emailAddress: userData.email,
      phoneNumber: userData.phone,
    };

    await this.notificationsService.sendWelcomeNotification(
      userData.name,
      preferences,
    );
  }
}
```

### Task Assignment Notification

```typescript
async assignTask(userId: string, taskData: any) {
  // ... assign task logic

  const user = await this.getUserById(userId);
  const preferences: UserNotificationPreferences = {
    email: user.emailNotifications,
    whatsapp: user.whatsappNotifications,
    emailAddress: user.email,
    phoneNumber: user.phone,
  };

  await this.notificationsService.sendTaskAssignmentNotification(
    user.name,
    taskData.title,
    taskData.project.name,
    preferences,
    taskData.id // Task ID for generating link
  );
}
```

### Task Links in Notifications

All task-related notifications now include direct links to tasks when a task ID is provided:

```typescript
// Task assignment with link
await this.notificationsService.sendTaskAssignmentNotification(
  'John Doe',
  'Fix login bug',
  'Website Redesign',
  preferences,
  'task-123', // This generates: FRONTEND_URL/tasks/task-123
);

// Task status update with link
await this.notificationsService.sendTaskStatusUpdateNotification(
  'John Doe',
  'Fix login bug',
  'Completed',
  preferences,
  'task-123',
);

// Comment mention with link
await this.notificationsService.sendCommentMentionNotification(
  'John Doe',
  'Jane Smith',
  'Fix login bug',
  'Website Redesign',
  'Please review the changes',
  preferences,
  'task-123',
);
```

The system automatically generates task URLs using the format: `FRONTEND_URL/tasks/:taskId`

### Advanced WhatsApp Features

```typescript
import { WhatsAppService } from './notifications';

@Injectable()
export class LocationService {
  constructor(private whatsAppService: WhatsAppService) {}

  // Send location
  async shareProjectLocation(phoneNumber: string) {
    await this.whatsAppService.sendLocation(
      phoneNumber,
      40.7128, // latitude
      -74.006, // longitude
      'Project Office Location',
    );
  }

  // Send contact information
  async shareTeamContact(phoneNumber: string, teamMember: any) {
    await this.whatsAppService.sendContact(phoneNumber, {
      name: teamMember.name,
      phone: teamMember.phone,
      email: teamMember.email,
    });
  }

  // Check if phone number is on WhatsApp
  async validatePhoneNumber(phoneNumber: string) {
    return await this.whatsAppService.isPhoneNumberOnWhatsApp(phoneNumber);
  }

  // Send project files
  async shareProjectFile(
    phoneNumber: string,
    fileUrl: string,
    fileName: string,
  ) {
    await this.whatsAppService.sendFileMessage(
      phoneNumber,
      fileUrl,
      fileName,
      'Project documentation attached',
    );
  }
}
```

### Custom Notifications

```typescript
// Send custom email
await this.notificationsService.sendCustomEmail(
  'user@example.com',
  'Custom Subject',
  '<h1>Custom HTML Content</h1>',
);

// Send custom WhatsApp message
await this.notificationsService.sendCustomWhatsAppMessage(
  '+1234567890',
  'Custom WhatsApp message',
);
```

### Instance Management

```typescript
import { WhatsAppService } from './notifications';

@Injectable()
export class WhatsAppManagementService {
  constructor(private whatsAppService: WhatsAppService) {}

  async getInstanceStatus() {
    const isAuthorized = await this.whatsAppService.checkWhatsAppStatus();
    const accountInfo = await this.whatsAppService.getAccountInfo();

    return { isAuthorized, accountInfo };
  }

  async setupNewInstance() {
    const qrCode = await this.whatsAppService.getQrCode();
    return qrCode; // Show this QR code to user
  }

  async logoutInstance() {
    return await this.whatsAppService.logoutInstance();
  }

  async rebootInstance() {
    return await this.whatsAppService.rebootInstance();
  }
}
```

## Available Methods

### NotificationsService

- `sendWelcomeNotification(userName, preferences)`
- `sendTaskAssignmentNotification(userName, taskTitle, projectName, preferences, taskId?)`
- `sendTaskStatusUpdateNotification(userName, taskTitle, status, preferences, taskId?)`
- `sendPasswordResetNotification(emailAddress, resetToken)`
- `sendProjectUpdateNotification(userName, projectName, updateMessage, preferences)`
- `sendReminderNotification(userName, reminderMessage, preferences)`
- `sendCommentMentionNotification(userName, authorName, taskTitle, projectName, commentContent, preferences, taskId?)`
- `sendCustomEmail(to, subject, htmlContent)`
- `sendCustomWhatsAppMessage(to, message)`
- `checkNotificationServicesStatus()`

### EmailService

- `sendEmail(options)`
- `sendWelcomeEmail(to, userName)`
- `sendTaskAssignmentEmail(to, userName, taskTitle, projectName, taskId?)`
- `sendTaskStatusUpdateEmail(to, userName, taskTitle, status, taskId?)`
- `generateCommentMentionEmailContent(userName, authorName, taskTitle, projectName, commentContent, taskId?)`
- `sendPasswordResetEmail(to, resetToken)`

### WhatsAppService

#### Basic Messaging

- `sendTextMessage(to, message)`
- `sendFileMessage(to, fileUrl, fileName, caption?)`
- `sendImageMessage(to, imageUrl, caption?)`

#### Template Messages

- `sendWelcomeMessage(to, userName)`
- `sendTaskAssignmentMessage(to, userName, taskTitle, projectName, taskId?)`
- `sendTaskStatusUpdate(to, userName, taskTitle, status, taskId?)`
- `generateCommentMentionMessage(userName, authorName, taskTitle, projectName, commentContent, taskId?)`
- `sendProjectUpdate(to, userName, projectName, updateMessage)`
- `sendReminder(to, userName, reminderMessage)`
- `sendTaskDeadlineReminder(to, userName, taskTitle, projectName, deadline, taskId?)`
- `sendProjectMilestoneUpdate(to, userName, projectName, milestoneName)`

#### Advanced Features

- `sendLocation(to, latitude, longitude, address?)`
- `sendContact(to, contactData)`
- `getMessageHistory(chatId, count?)`
- `isPhoneNumberOnWhatsApp(phoneNumber)`

#### Instance Management

- `checkWhatsAppStatus()`
- `getAccountInfo()`
- `getQrCode()`
- `logoutInstance()`
- `rebootInstance()`

## Types

```typescript
interface UserNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  emailAddress?: string;
  phoneNumber?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

interface WhatsAppMessage {
  to: string;
  message: string;
  type?: 'text' | 'file' | 'image';
  fileName?: string;
  fileUrl?: string;
}

interface WhatsAppFileMessage extends WhatsAppMessage {
  type: 'file' | 'image';
  fileName: string;
  fileUrl: string;
}
```

## Status Emojis

The WhatsApp service includes status emojis for better visual communication:

- `todo`: 📝
- `in_progress`: ⚡
- `in_review`: 👀
- `completed`: ✅
- `cancelled`: ❌
- `on_hold`: ⏸️
- `pending`: ⏳
- `blocked`: 🚫

## Error Handling

All methods include comprehensive error handling and logging. Check your application logs for detailed error information if notifications fail to send.

## Testing

The module includes test endpoints in the NotificationsController:

- `GET /notifications/whatsapp` - Send test WhatsApp message
- `GET /notifications/email/verify` - Verify email connection
- `POST /notifications/email/test` - Send test email
- `POST /notifications/task/test` - Send test task notification with task link

### Example Test Requests

Test email request:

```json
{
  "to": "user@example.com",
  "subject": "Test Subject",
  "message": "Test message content"
}
```

Test task notification request:

```json
{
  "to": "user@example.com",
  "phone": "+1234567890",
  "userName": "John Doe",
  "taskTitle": "Fix login bug",
  "projectName": "Website Redesign",
  "taskId": "task-123",
  "type": "assignment"
}
```

Available notification types for task testing:

- `assignment` - Task assignment notification
- `status_update` - Task status update notification (include `status` field)
- `comment_mention` - Comment mention notification (include `authorName` and `commentContent` fields)
