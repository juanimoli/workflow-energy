# Email Setup with Nodemailer

This backend uses **Nodemailer** for sending password reset emails and other notifications via SMTP (Gmail compatible).

## Quick Setup

### Production (Required)

Add these environment variables:

```env
NODE_ENV=production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=your-email@gmail.com
FRONTEND_URL=https://your-production-domain.com
```

### Development (Optional)

If email credentials are not set in development, emails will be logged to console and saved to `backend/logs/password-reset-urls.txt`.

```env
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=your-email@gmail.com
FRONTEND_URL=http://localhost:3002
```

## Setup Gmail for Nodemailer

### Option 1: App Password (Recommended)

1. **Enable 2FA** on your Gmail account: https://myaccount.google.com/security
2. **Generate App Password**: 
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" → Enter "WorkFlow Energy"
   - Click "Generate"
3. **Copy the 16-character password** (without spaces)
4. **Add to environment**: `EMAIL_PASSWORD=your-app-password`

### Option 2: Less Secure Apps (Not Recommended)

If you don't have 2FA enabled:
1. Go to: https://myaccount.google.com/lesssecureapps
2. Turn on "Allow less secure apps"
3. Use your regular Gmail password

## Environment Variables

### Required for Production

- `EMAIL_HOST`: SMTP server host (e.g., `smtp.gmail.com`)
- `EMAIL_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `EMAIL_SECURE`: Use SSL (true for port 465, false for 587)
- `EMAIL_USER`: Your email address
- `EMAIL_PASSWORD`: Your email password or app password
- `EMAIL_FROM_ADDRESS`: Sender email address (usually same as EMAIL_USER)

### Optional

- `FRONTEND_URL`: Base URL for password reset links (default: `http://localhost:3002`)
- `EMAIL_RESET_BASE_URL`: Override for reset link base URL

## Reset URL Priority

The system builds password reset links in this order:

1. `EMAIL_RESET_BASE_URL` (if set, takes precedence)
2. `LOCAL_FRONTEND_URL` (only in development)
3. `FRONTEND_URL`
4. `http://localhost:3002` (fallback)

## Testing Password Reset

### Via UI
Navigate to login page → "¿Olvidaste tu contraseña?"

### Via API
```bash
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Development Mode (No API Key)

If email credentials are not set in development:

1. **Console Output**: Reset URL printed to terminal
2. **File Log**: URLs saved to `backend/logs/password-reset-urls.txt`
3. **Dev Endpoint**: `GET http://localhost:5001/dev-reset-urls` (only in development)

## Verifying Email Configuration

Check backend startup logs for:

```
Email service initialized successfully with Nodemailer {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'your-email@gmail.com'
}
```

## Troubleshooting

### No emails being sent

- Verify all EMAIL_* environment variables are set correctly
- Check EMAIL_PASSWORD is your app password (not regular password)
- Review backend logs for SMTP connection errors
- Ensure 2FA is enabled and app password is generated

### Authentication failed

- If using Gmail: Make sure you're using an **App Password**, not your regular password
- Enable 2FA on your Google account first
- Generate a new app password if the current one doesn't work

### Connection timeout

- Check EMAIL_HOST and EMAIL_PORT are correct
- Verify firewall isn't blocking SMTP port (587 or 465)
- Try EMAIL_SECURE=false for port 587

### Gmail rate limiting

Gmail free accounts have sending limits:
- 500 emails/day for regular Gmail accounts
- 2,000 emails/day for Google Workspace accounts

If you exceed limits, wait 24 hours or upgrade to Google Workspace.

## Production Checklist

- [ ] `EMAIL_HOST` configured (e.g., smtp.gmail.com)
- [ ] `EMAIL_PORT` set correctly (587 or 465)
- [ ] `EMAIL_SECURE` matches port (false for 587, true for 465)
- [ ] `EMAIL_USER` set to your email address
- [ ] `EMAIL_PASSWORD` set to app password
- [ ] `EMAIL_FROM_ADDRESS` configured
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` points to production frontend
- [ ] 2FA enabled on Gmail account
- [ ] App password generated and tested
- [ ] Test password reset flow end-to-end

## Alternative SMTP Providers

While this is configured for Gmail, you can use any SMTP provider:

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
```

### Outlook/Office365
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```
