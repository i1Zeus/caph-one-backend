# User Invitation Setup Guide

This feature allows you to automatically send user invitations via email and WhatsApp when creating new users.

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Frontend URL for login links in invitations
FRONTEND_URL=http://localhost:5173

# Email Configuration (required for email invitations)
EMAIL_PROVIDER=smtp
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# WhatsApp Configuration (required for WhatsApp invitations)
WHATSAPP_API_URL=your-whatsapp-api-url
WHATSAPP_API_TOKEN=your-whatsapp-api-token
```

## Features

### 🎯 **User Creation with Invitations**

When creating a new user, you can now:

- ✅ **Send Email Invitation** - Beautiful HTML email with login credentials
- ✅ **Send WhatsApp Invitation** - Formatted message with login details  
- ✅ **Custom Login URL** - Override default login URL
- ✅ **Graceful Failure** - User creation succeeds even if notifications fail

### 📧 **Email Invitation Features**

- Professional HTML email template
- Login credentials clearly displayed
- Direct login button/link
- Security reminder to change password
- Company branding (DevHouse ERP)

### 📱 **WhatsApp Invitation Features**

- Formatted message with emojis
- Login credentials in code format
- Direct login link
- Professional company signature
- Security reminders

## Usage

### Frontend (Create User Form)

The create user form now includes:

```typescript
interface CreateUserDto {
  // ... existing fields
  sendEmailInvitation?: boolean      // Default: true
  sendWhatsAppInvitation?: boolean   // Default: true  
  customLoginUrl?: string           // Optional custom URL
}
```

### Backend API

```typescript
POST /users
{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "+1234567890",
  "password": "temporary123",
  "role": "EMPLOYEE",
  "sendEmailInvitation": true,
  "sendWhatsAppInvitation": true,
  "customLoginUrl": "https://mycompany.com/login"
}
```

### Programmatic Usage

```typescript
// In any service
await this.notificationsService.sendUserInvitationNotification(
  userName,
  email,
  temporaryPassword,
  {
    email: true,
    whatsapp: true,
    emailAddress: 'user@example.com',
    phoneNumber: '+1234567890'
  },
  'https://custom-login-url.com'
);
```

## Email Template Preview

The email includes:
- 🏢 Company header with logo
- 👋 Personal greeting
- 📋 Login credentials in highlighted box
- 🔗 Prominent login button
- ⚠️ Security reminders
- 📞 Support contact information

## WhatsApp Message Preview

```
🎉 Welcome to DevHouse ERP!

Hi John Doe,

You've been invited to join our project management team! 

📋 Your Login Credentials:
✉️ Email: john@example.com
🔑 Password: `temporary123`

🔗 Login Here:
https://app.devhouse.com/auth/login

⚠️ Important: Please change your password after your first login.

Need help? Just reply to this message!

Best regards,
DevHouse Team 🏢
```

## Error Handling

- ✅ User creation **always succeeds** even if notifications fail
- ✅ Individual notification failures are logged but don't block creation
- ✅ Frontend shows success message regardless of notification status
- ✅ Failed notifications can be resent manually if needed

## Testing

1. **Test Email Setup:**
   ```bash
   # Make sure your SMTP settings work
   curl -X POST http://localhost:3000/notifications/test-email \
     -H "Content-Type: application/json" \
     -d '{"to": "test@example.com"}'
   ```

2. **Test WhatsApp Setup:**
   ```bash
   # Make sure your WhatsApp API works  
   curl -X POST http://localhost:3000/notifications/test-whatsapp \
     -H "Content-Type: application/json" \
     -d '{"to": "+1234567890"}'
   ```

3. **Create Test User:**
   - Go to Users → Create User
   - Fill in details
   - Check both invitation options
   - Submit and verify notifications are sent

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify email provider allows SMTP
- Check firewall/port restrictions
- Test with a simple email service first

### WhatsApp Not Sending  
- Verify WhatsApp API credentials
- Check phone number format (+country code)
- Ensure WhatsApp API service is active
- Test API endpoint manually

### Login URL Issues
- Verify `FRONTEND_URL` in `.env`
- Check that custom URLs are accessible
- Ensure HTTPS for production environments

## Security Notes

- 🔒 Temporary passwords are sent once and should be changed immediately
- 🔒 Notification failures don't expose sensitive data
- 🔒 Login URLs should use HTTPS in production
- 🔒 Monitor invitation logs for suspicious activity 