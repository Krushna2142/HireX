/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendPasswordReset(email: string, name: string, resetLink: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for your Job Crawler account.</p>
        <p>Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
        <a href="${resetLink}"
          style="display:inline-block;margin:20px 0;padding:12px 24px;background:linear-gradient(to right,#7c3aed,#4f46e5);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
          Reset Password
        </a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#9ca3af;font-size:12px;">If the button doesn't work, copy and paste this link into your browser:<br>${resetLink}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#9ca3af;font-size:12px;">Job Crawler &mdash; Your AI-powered career platform</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Job Crawler" <${this.config.get('SMTP_USER')}>`,
        to: email,
        subject: 'Reset Your Password — Job Crawler',
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send reset email to ${email}: ${String(err)}`);
    }
  }
}
