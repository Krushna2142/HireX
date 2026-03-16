/* eslint-disable prettier/prettier */
import { IsEmail, IsString } from 'class-validator';
// ts-api/src/auth/dto/login.dto.ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}