/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 480px; margin: 40px auto; background: #1e293b; border-radius: 12px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
            h1 { color: #a78bfa; font-size: 24px; margin-bottom: 16px; }
            p { color: #94a3b8; line-height: 1.6; }
            .btn { display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset Request</h1>
            <p>We received a request to reset your Job Crawler account password. Click the button below to set a new password.</p>
            <p>This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetLink}" class="btn">Reset Password</a>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            <div class="footer">
              <p>Job Crawler &mdash; Secure Password Reset</p>
              <p>If the button doesn't work, copy and paste this link into your browser:<br />${resetLink}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: `"Job Crawler" <${this.config.get<string>('SMTP_USER')}>`,
      to,
      subject: 'Reset your Job Crawler password',
      html,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }
}
