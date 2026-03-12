import { IsEmail, IsString, MinLength } from 'class-validator';
// ts-api/src/auth/dto/register.dto.ts
export class RegisterDto {
  @IsString()
  @MinLength(2)
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}