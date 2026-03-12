import { IsString, MinLength } from 'class-validator';
// ts-api/src/auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}