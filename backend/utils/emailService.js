const logger = require('./logger');

/**
 * Email service with multi-provider support.
 * Providers:
 *  - dev (default fallback): logs email + writes URL file
 *  - sendgrid: requires SENDGRID_API_KEY
 *  - smtp: requires SMTP_HOST, optional SMTP_PORT, SMTP_USER, SMTP_PASS
 *  - ethereal: ephemeral test inbox (set EMAIL_PROVIDER=ethereal)
 */
let sgMail = null;
let nodemailer = null;

class EmailService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();

    // Auto-detect provider if not explicitly set
    if (!this.provider) {
      if (process.env.SENDGRID_API_KEY) this.provider = 'sendgrid';
      else if (process.env.SMTP_HOST) this.provider = 'smtp';
      else this.provider = this.isDevelopment ? 'ethereal' : 'dev';
    }

    // Prepare SMTP config (used for smtp provider)
    this.smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    };
  }

  async sendPasswordReset(email, resetToken, userName = '') {
    try {
      // Determine which base URL to use for the reset link
      // Priority:
      // 1) EMAIL_RESET_BASE_URL (forces a specific host in any env)
      // 2) LOCAL_FRONTEND_URL when in development
      // 3) FRONTEND_URL
      // 4) http://localhost:3002
      const selectedBase = process.env.EMAIL_RESET_BASE_URL
        || (this.isDevelopment ? process.env.LOCAL_FRONTEND_URL : null)
        || process.env.FRONTEND_URL
        || 'http://localhost:3002';
      const frontendBase = selectedBase.replace(/\/$/, '');
      const resetUrl = `${frontendBase}/reset-password?token=${resetToken}`;
      const emailData = {
        to: email,
        subject: 'Recuperación de Contraseña - WorkFlow Energy',
        html: this.generatePasswordResetHtml(userName, resetUrl),
        text: this.generatePasswordResetText(userName, resetUrl)
      };

  // Provider routing
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendWithSendGrid(emailData, resetUrl);
        case 'smtp':
          return await this.sendWithSMTP(emailData, resetUrl);
        case 'ethereal':
          return await this.sendWithEthereal(emailData, resetUrl);
        case 'dev':
        default:
          this.logDevEmail(emailData, resetUrl);
          return { success: true, provider: 'dev', messageId: 'dev-mode-' + Date.now() };
      }
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendWithSendGrid(emailData, resetUrl) {
    try {
      if (!sgMail) sgMail = require('@sendgrid/mail');
      if (!process.env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY no configurada');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const fromEmail = process.env.EMAIL_FROM || 'no-reply@workflowenergy.com';
      const msg = { from: fromEmail, ...emailData };
      const [resp] = await sgMail.send(msg);
      logger.info('Password reset email sent via SendGrid', { to: emailData.to, status: resp?.statusCode });
      return { success: true, provider: 'sendgrid', status: resp?.statusCode };
    } catch (err) {
      logger.error('SendGrid error:', err);
      if (this.isDevelopment) {
        this.logDevEmail(emailData, resetUrl);
        return { success: true, provider: 'dev-fallback' };
      }
      return { success: false, error: err.message };
    }
  }

  async sendWithSMTP(emailData, resetUrl) {
    try {
      if (!nodemailer) nodemailer = require('nodemailer');
      if (!this.smtpConfig.host) throw new Error('SMTP_HOST no configurado');
      const transporter = nodemailer.createTransport(this.smtpConfig);
      const fromEmail = process.env.EMAIL_FROM || 'no-reply@workflowenergy.com';
      const info = await transporter.sendMail({ from: fromEmail, ...emailData });
      logger.info('Password reset email sent via SMTP', { to: emailData.to, messageId: info.messageId });
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      logger.error('SMTP error:', err);
      if (this.isDevelopment) {
        this.logDevEmail(emailData, resetUrl);
        return { success: true, provider: 'dev-fallback' };
      }
      return { success: false, error: err.message };
    }
  }

  async sendWithEthereal(emailData, resetUrl) {
    try {
      if (!nodemailer) nodemailer = require('nodemailer');
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const fromEmail = process.env.EMAIL_FROM || 'no-reply@workflowenergy.com';
      const info = await transporter.sendMail({ from: fromEmail, ...emailData });
      const preview = nodemailer.getTestMessageUrl(info);
      logger.info('Ethereal email preview URL', { preview });
      return { success: true, provider: 'ethereal', messageId: info.messageId, preview };
    } catch (err) {
      logger.error('Ethereal error:', err);
      if (this.isDevelopment) {
        this.logDevEmail(emailData, resetUrl);
        return { success: true, provider: 'dev-fallback' };
      }
      return { success: false, error: err.message };
    }
  }

  logDevEmail(emailData, resetUrl) {
    const { to, subject } = emailData;
    logger.info('📧 Password Reset Email (DEVELOPMENT MODE)', {
      to,
      subject,
      resetUrl,
      expires: '1 hour'
    });
    console.log('\n=== PASSWORD RESET EMAIL (DEV MODE) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('======================================\n');

    // Persist reset URL for quick access
    try {
      const fs = require('fs');
      const path = require('path');
      const logsDir = path.join(__dirname, '../logs');
      const resetUrlFile = path.join(logsDir, 'password-reset-urls.txt');
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} - Email: ${to} - Reset URL: ${resetUrl}\n`;
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
      fs.appendFileSync(resetUrlFile, logEntry, { encoding: 'utf8' });
      console.log(`Reset URL also saved to: ${resetUrlFile}`);
    } catch (err) {
      console.log('Could not write reset URL log file:', err.message);
    }
  }

  generatePasswordResetHtml(userName, resetUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Recuperación de Contraseña</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2196F3;">Recuperación de Contraseña</h2>
        
        <p>Hola${userName ? ` ${userName}` : ''},</p>
        
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en WorkFlow Energy.</p>
        
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Restablecer Contraseña
            </a>
        </div>
        
        <p>Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">
            ${resetUrl}
        </p>
        
        <p><strong>Este enlace expirará en 1 hora por motivos de seguridad.</strong></p>
        
        <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña no será cambiada.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
            Este correo fue enviado por WorkFlow Energy. Si tienes problemas, contacta a soporte técnico.
        </p>
    </div>
</body>
</html>`;
  }

  generatePasswordResetText(userName, resetUrl) {
    return `
Recuperación de Contraseña - WorkFlow Energy

Hola${userName ? ` ${userName}` : ''},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en WorkFlow Energy.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

Este enlace expirará en 1 hora por motivos de seguridad.

Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña no será cambiada.

---
Este correo fue enviado por WorkFlow Energy.
`;
  }
}

module.exports = new EmailService();