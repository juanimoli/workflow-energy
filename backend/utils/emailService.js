const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email service using Nodemailer with Gmail SMTP
 * Requires: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD environment variables
 */
class EmailService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Configure Nodemailer transporter
    this.transporter = null;
    
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT || 587;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailSecure = process.env.EMAIL_SECURE === 'true';
    
    if (emailHost && emailUser && emailPassword) {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort),
        secure: emailSecure, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      });
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service connection failed:', error);
        } else {
          logger.info('Email service initialized successfully with Nodemailer', {
            host: emailHost,
            port: emailPort,
            user: emailUser
          });
        }
      });
    } else {
      logger.warn('Email credentials not configured. Emails will be logged in development mode only.');
    }
  }

  async sendPasswordReset(email, resetToken, userName = '') {
    try {
      // Determine which base URL to use for the reset link
      const selectedBase = process.env.EMAIL_RESET_BASE_URL
        || (this.isDevelopment ? process.env.LOCAL_FRONTEND_URL : null)
        || process.env.FRONTEND_URL
        || 'http://localhost:3002';
      const frontendBase = selectedBase.replace(/\/$/, '');
      const resetUrl = `${frontendBase}/reset-password?token=${resetToken}`;

      // If no transporter configured, log in dev mode
      if (!this.transporter) {
        if (this.isDevelopment) {
          this.logDevEmail(email, resetUrl, userName);
          return { success: true, provider: 'dev', messageId: 'dev-mode-' + Date.now() };
        } else {
          throw new Error('Email service not configured in production');
        }
      }

      // Send email via Nodemailer
      const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
      const info = await this.transporter.sendMail({
        from: `"WorkFlow Energy" <${fromEmail}>`,
        to: email,
        subject: 'Recuperación de Contraseña - WorkFlow Energy',
        html: this.generatePasswordResetHtml(userName, resetUrl),
      });

      logger.info('Password reset email sent via Nodemailer', { 
        to: email, 
        messageId: info.messageId 
      });
      
      return { 
        success: true, 
        provider: 'nodemailer', 
        messageId: info.messageId 
      };

    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      
      // Fallback to dev logging in development
      if (this.isDevelopment) {
        const selectedBase = process.env.EMAIL_RESET_BASE_URL
          || (this.isDevelopment ? process.env.LOCAL_FRONTEND_URL : null)
          || process.env.FRONTEND_URL
          || 'http://localhost:3002';
        const frontendBase = selectedBase.replace(/\/$/, '');
        const resetUrl = `${frontendBase}/reset-password?token=${resetToken}`;
        this.logDevEmail(email, resetUrl, userName);
        return { success: true, provider: 'dev-fallback' };
      }
      
      throw error;
    }
  }

  logDevEmail(email, resetUrl, userName) {
    logger.info('📧 Password Reset Email (DEVELOPMENT MODE)', {
      to: email,
      resetUrl,
      expires: '1 hour'
    });
    console.log('\n=== PASSWORD RESET EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`User: ${userName || 'N/A'}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('======================================\n');

    // Persist reset URL for quick access
    try {
      const fs = require('fs');
      const path = require('path');
      const logsDir = path.join(__dirname, '../logs');
      const resetUrlFile = path.join(logsDir, 'password-reset-urls.txt');
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} - Email: ${email} - Reset URL: ${resetUrl}\n`;
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
}

module.exports = new EmailService();