/* eslint-disable prettier/prettier */
import { IsEmail } from 'class-validator';
// ts-api/src/auth/dto/forgot-password.dto.ts
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}