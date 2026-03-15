/* eslint-disable prettier/prettier */
// src/auth/dto/register.dto.ts
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsIn(['candidate', 'recruiter'])  // ✅ validated at controller level
  role: 'candidate' | 'recruiter';
}