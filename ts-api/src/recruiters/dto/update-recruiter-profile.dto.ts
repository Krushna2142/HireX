/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  IsString, IsOptional, IsArray, IsBoolean,
  IsNumber, IsIn, IsUrl, Min,
} from 'class-validator';

export class UpdateRecruiterProfileDto {
  @IsString() @IsOptional()
  title?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsUrl() @IsOptional()
  photoUrl?: string;

  @IsUrl() @IsOptional()
  linkedinUrl?: string;

  @IsString() @IsOptional()
  companyName?: string;

  @IsIn(['1-10', '11-50', '51-200', '201-500', '500+']) @IsOptional()
  companySize?: string;

  @IsArray() @IsOptional()
  companyIndustry?: string[];

  @IsUrl() @IsOptional()
  companyWebsite?: string;

  @IsUrl() @IsOptional()
  companyLogoUrl?: string;

  @IsString() @IsOptional()
  companyDescription?: string;

  @IsString() @IsOptional()
  companyLocation?: string;

  @IsArray() @IsOptional()
  hiringRoles?: string[];

  @IsArray() @IsOptional()
  typicalStack?: string[];

  @IsIn(['1-5', '5-20', '20+']) @IsOptional()
  hiringVolume?: string;

  @IsBoolean() @IsOptional()
  openToRemote?: boolean;
}