/* eslint-disable prettier/prettier */
import {
  IsString, IsNotEmpty, IsOptional, IsNumber,
  IsArray, IsIn, Min, Max,
} from 'class-validator';

export class CreateJobDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsString() @IsNotEmpty()
  company: string;

  @IsString() @IsOptional()
  location?: string;

  @IsIn(['remote', 'hybrid', 'onsite']) @IsOptional()
  workMode?: string;

  @IsIn(['full_time', 'contract', 'part_time', 'freelance']) @IsOptional()
  employmentType?: string;

  @IsNumber() @IsOptional() @Min(0)
  salaryMin?: number;

  @IsNumber() @IsOptional()
  salaryMax?: number;

  @IsString() @IsOptional()
  salaryCurrency?: string;

  @IsArray() @IsOptional()
  requiredSkills?: string[];

  @IsNumber() @IsOptional() @Min(0)
  experienceMin?: number;

  @IsNumber() @IsOptional() @Max(40)
  experienceMax?: number;

  @IsString() @IsOptional()
  industry?: string;
}