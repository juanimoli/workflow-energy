# Email Providers Setup (Local & Production)

This backend supports multiple email providers for password reset and future notifications.

Providers:
- dev (default): Logs email content and writes reset URLs to `backend/logs/password-reset-urls.txt`.
- sendgrid: Uses SendGrid API.
- smtp: Uses any SMTP server (e.g., Mailtrap for local, corporate SMTP, Postmark, etc.).
- ethereal: Ephemeral inbox for development (preview URL in logs).

## Environment Variables

Common:
- FRONTEND_URL=http://localhost:3002
- EMAIL_FROM=no-reply@workflowenergy.com
- EMAIL_PROVIDER=dev | sendgrid | smtp | ethereal (optional; auto-detects if not set)
- EMAIL_RESET_BASE_URL=http://localhost:3002 (takes absolute precedence for building reset links)
- LOCAL_FRONTEND_URL=http://localhost:3002 (used in development when no EMAIL_RESET_BASE_URL)

SendGrid:
- SENDGRID_API_KEY=SG.xxxxxx

SMTP:
- SMTP_HOST=smtp.mailtrap.io (or your SMTP host)
- SMTP_PORT=587 (default 587)
- SMTP_SECURE=false (true only for TLS/465)
- SMTP_USER=your_user
- SMTP_PASS=your_pass

Ethereal:
- EMAIL_PROVIDER=ethereal (no other vars needed; creates a throwaway account automatically)

If `EMAIL_PROVIDER` is not set, auto-selection order:
1) `sendgrid` if `SENDGRID_API_KEY` is present
2) `smtp` if `SMTP_HOST` is present
3) `ethereal` if in development (default convenient local inbox)
4) `dev` otherwise

## Local Development Options

1) Ethereal (now default if no provider vars set, in dev):
  - Just start the backend; a test account is created automatically.
  - After a password reset request you can run `node test-password-reset.js` or check logs for preview URL.

2) Dev logger (force no real email):
  - Set `EMAIL_PROVIDER=dev` explicitly.
  - Reset URLs are logged and saved to `backend/logs/password-reset-urls.txt`.

3) Mailtrap (SMTP realistic local):
  - Set `EMAIL_PROVIDER=smtp` and provide SMTP_* variables.

## Production Setup (Recommended)

- Use SendGrid:
  - Set `EMAIL_PROVIDER=sendgrid`
  - Set `SENDGRID_API_KEY`
  - Set `EMAIL_FROM` to a verified sender address

Alternatively, use your company SMTP:
- Set `EMAIL_PROVIDER=smtp` and the `SMTP_*` variables accordingly

## Verifying the Flow

- Trigger "¿Olvidaste tu contraseña?" in the UI or POST to `/api/auth/forgot-password`.
- Reset URL base selection order for links:
  1) EMAIL_RESET_BASE_URL
  2) LOCAL_FRONTEND_URL (only in development)
  3) FRONTEND_URL
  4) http://localhost:3002
- In dev, list recent URLs:
  - GET `/dev-reset-urls` or open `backend/logs/password-reset-urls.txt`.
- Open the link and complete the reset at `/reset-password`.

## Troubleshooting

- No emails in production:
  - Check logs for provider errors.
  - Verify `EMAIL_PROVIDER` and required variables.
  - For SendGrid, verify sender domain and API key permissions.
- Local curl failing:
  - Ensure backend is running on the expected port. Set `PORT=3001` to match your curl example.
