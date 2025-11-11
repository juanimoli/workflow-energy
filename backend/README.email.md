# Email Setup with Resend.com

This backend uses **Resend.com** for sending password reset emails and other notifications.

## Quick Setup

### Production (Required)

Add these environment variables:

```env
NODE_ENV=production
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-production-domain.com
```

### Development (Optional)

If `RESEND_API_KEY` is not set in development, emails will be logged to console and saved to `backend/logs/password-reset-urls.txt`.

```env
NODE_ENV=development
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx  # Optional for dev
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3002
```

## Get Your Resend API Key

1. **Sign up**: https://resend.com (Free tier: 100 emails/day, 3,000/month)
2. **Verify your domain** (or use `onboarding@resend.dev` for testing)
3. **Create API Key**: Dashboard → API Keys → Create API Key
4. **Copy the key** (starts with `re_`)
5. **Add to environment**: `RESEND_API_KEY=re_your_key_here`

## Environment Variables

### Required for Production

- `RESEND_API_KEY`: Your Resend API key (starts with `re_`)
- `EMAIL_FROM`: Verified sender email address

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

If `RESEND_API_KEY` is not set in development:

1. **Console Output**: Reset URL printed to terminal
2. **File Log**: URLs saved to `backend/logs/password-reset-urls.txt`
3. **Dev Endpoint**: `GET http://localhost:5001/dev-reset-urls` (only in development)

## Verifying Email Logs

Check backend startup logs for:

```
=== EMAIL CONFIGURATION ===
Has Resend API Key: true
EMAIL_FROM: noreply@yourdomain.com
===========================
```

## Troubleshooting

### No emails in production

- Verify `RESEND_API_KEY` is set correctly
- Check `EMAIL_FROM` is a verified sender in Resend dashboard
- Review backend logs for API errors

### Domain verification required

If using a custom domain, you must verify it in Resend:
- Dashboard → Domains → Add Domain
- Add DNS records (SPF, DKIM)
- Wait for verification (usually < 1 hour)

Or use `onboarding@resend.dev` for testing (limited to verified recipient emails).

### Rate limiting

Free tier limits:
- 100 emails/day
- 3,000 emails/month

Upgrade your plan if needed.

## Production Checklist

- [ ] `RESEND_API_KEY` configured
- [ ] `EMAIL_FROM` set to verified sender
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` points to production frontend
- [ ] Domain verified in Resend (if using custom domain)
- [ ] Test password reset flow end-to-end
