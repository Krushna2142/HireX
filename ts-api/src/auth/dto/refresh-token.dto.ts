/* eslint-disable prettier/prettier */
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
