# Google Workspace Email Setup Guide

This guide will help you configure the email service to work with Google Workspace (formerly G Suite).

## Configuration Options

You have two options for authenticating with Google Workspace:

### Option 1: App Password (Recommended for simplicity)

This is the easiest method but requires 2-factor authentication to be enabled.

#### Steps:

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Navigate to Security > 2-Step Verification > App passwords
   - Select "Mail" and generate a password
   - Copy the 16-character password

#### Environment Variables:

```env
EMAIL_PROVIDER=google-workspace
GMAIL_USER=your-email@yourdomain.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@yourdomain.com
```

### Option 2: OAuth2 (More secure, more complex)

This method is more secure but requires additional setup.

#### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API
4. Create OAuth2 credentials:
   - Go to APIs & Services > Credentials
   - Create OAuth2 Client ID (Web application)
   - Add authorized redirect URIs
5. Get refresh token using OAuth2 playground

#### Environment Variables:

```env
EMAIL_PROVIDER=google-workspace
GMAIL_USE_OAUTH2=true
GMAIL_USER=your-email@yourdomain.com
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
EMAIL_FROM=your-email@yourdomain.com
```

## Testing the Configuration

You can test your email configuration by calling the verification method:

```typescript
// In your service or controller
const isWorking = await this.emailService.verifyConnection();
console.log('Email service working:', isWorking);
```

## Troubleshooting

### Common Issues:

1. **"Invalid credentials"**
   - Check that 2FA is enabled for App Password method
   - Verify the app password is correct (no spaces)

2. **"Authentication failed"**
   - Ensure the email address is correct
   - For custom domains, make sure the email exists in Google Workspace

3. **"Less secure app access"**
   - This shouldn't be an issue with App Passwords, but ensure "Less secure app access" is not blocking your attempts

4. **OAuth2 token expired**
   - Refresh tokens can expire; you may need to regenerate them

### Security Best Practices:

1. Use App Passwords instead of your main password
2. Store credentials in environment variables, never in code
3. Use OAuth2 for production environments
4. Regularly rotate your credentials
5. Monitor email sending logs

## Environment File Example

Create a `.env` file in your backend root with:

```env
# Email Configuration for Google Workspace
EMAIL_PROVIDER=google-workspace
GMAIL_USER=noreply@yourcompany.com
GMAIL_APP_PASSWORD=your-app-password-here
EMAIL_FROM=noreply@yourcompany.com

# Optional: OAuth2 (comment out if using App Password)
# GMAIL_USE_OAUTH2=true
# GMAIL_CLIENT_ID=your-client-id
# GMAIL_CLIENT_SECRET=your-client-secret
# GMAIL_REFRESH_TOKEN=your-refresh-token

# Frontend URL for password reset links
FRONTEND_URL=http://localhost:3000
```

## Rate Limits

Google Workspace has the following limits:

- **Standard Gmail**: 500 emails per day
- **Google Workspace**: Higher limits depending on your plan
- **Burst rate**: ~100 emails per hour

Make sure your application respects these limits to avoid being blocked.
