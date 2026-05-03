/* eslint-disable prettier/prettier */
import { IsString, MinLength } from 'class-validator';
// ts-api/src/auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  new_password: string;
}
