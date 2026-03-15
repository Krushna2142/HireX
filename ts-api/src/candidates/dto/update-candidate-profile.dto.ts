/* eslint-disable prettier/prettier */
import {
  IsString, IsOptional, IsArray, IsBoolean,
  IsNumber, IsIn, IsUrl, Min,
} from 'class-validator';

export class UpdateCandidateProfileDto {
  @IsString() @IsOptional()
  headline?: string;

  @IsString() @IsOptional()
  bio?: string;

  @IsString() @IsOptional()
  location?: string;

  @IsString() @IsOptional()
  phone?: string;

  @IsUrl() @IsOptional()
  photoUrl?: string;

  @IsIn(['immediate', '2_weeks', '1_month', 'not_looking']) @IsOptional()
  availability?: string;

  @IsArray() @IsOptional()
  targetRoles?: string[];

  @IsArray() @IsOptional()
  targetIndustries?: string[];

  @IsArray() @IsOptional()
  employmentTypes?: string[];

  @IsIn(['remote', 'hybrid', 'onsite', 'any']) @IsOptional()
  workMode?: string;

  @IsNumber() @IsOptional() @Min(0)
  salaryMin?: number;

  @IsNumber() @IsOptional() @Min(0)
  salaryMax?: number;

  @IsString() @IsOptional()
  salaryCurrency?: string;

  @IsBoolean() @IsOptional()
  salaryNegotiable?: boolean;

  @IsBoolean() @IsOptional()
  willingToRelocate?: boolean;

  @IsArray() @IsOptional()
  preferredLocations?: string[];

  @IsBoolean() @IsOptional()
  isVisible?: boolean;
}