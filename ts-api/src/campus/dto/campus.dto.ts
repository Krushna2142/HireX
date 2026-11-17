// ts-api/src/campus/dto/campus.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber,
  IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength,
  ValidateNested,
} from 'class-validator';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit?: number = 25;

  @IsOptional() @IsString() @MaxLength(120)
  search?: string;
}

export class CreateCompanyDto {
  @IsOptional() @IsString() @MaxLength(180)
  name?: string;

  @IsOptional() @IsString() @MaxLength(220) website?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsString() @MaxLength(180) location?: string;
  @IsOptional() @IsString() @MaxLength(60) size?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) industry?: string[];
}

export class CreateCollegeDto {
  @IsString() @MinLength(2) @MaxLength(220) name!: string;
  @IsOptional() @IsString() @MaxLength(60) code?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) state?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(220) website?: string;
}

export class CreateCampusDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
}

export class CreateDepartmentDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsString() @MinLength(1) @MaxLength(40) code!: string;
  @IsOptional() @IsUUID() campusId?: string;
}

export class CreateBranchDto {
  @IsUUID() departmentId!: string;
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsString() @MinLength(1) @MaxLength(40) code!: string;
  @IsOptional() @IsIn(['UG', 'PG', 'DIPLOMA', 'OTHER']) programLevel?: 'UG' | 'PG' | 'DIPLOMA' | 'OTHER';
  @IsOptional() @IsString() @MaxLength(80) canonicalKey?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsOptional() @IsIn(['UG', 'PG', 'DIPLOMA', 'OTHER']) programLevel?: 'UG' | 'PG' | 'DIPLOMA' | 'OTHER';
  @IsOptional() @IsString() @MaxLength(80) canonicalKey?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
}

export class StudentImportRowDto {
  @IsString() @MaxLength(220) email!: string;
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsString() @MaxLength(80) enrollmentNo!: string;
  @IsUUID() branchId!: string;
  @IsOptional() @IsUUID() campusId?: string;
  @Type(() => Number) @IsInt() @Min(1950) @Max(2100) graduationYear!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10) cgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) tenthPct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) twelfthPct?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) activeBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) historicalBacklogs?: number;
  @IsOptional() @IsObject() customAcademics?: Record<string, unknown>;
}

export class ImportStudentsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => StudentImportRowDto)
  rows!: StudentImportRowDto[];

  @IsOptional() @IsString() @MaxLength(120) idempotencyKey?: string;
}

export class StudentFilterDto extends PaginationDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @Type(() => Number) @IsInt() graduationYear?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxCgpa?: number;
  @IsOptional() @Type(() => Number) @IsInt() maxActiveBacklogs?: number;
  @IsOptional() @IsIn(['ACTIVE', 'GRADUATED', 'SUSPENDED', 'ALUMNI']) status?: string;
}

export class CustomRuleDto {
  @IsString() @MaxLength(80) field!: string;
  @IsIn(['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in', 'not_in', 'contains', 'exists'])
  operator!: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'in' | 'not_in' | 'contains' | 'exists';
  @IsOptional() value?: unknown;
  @IsOptional() @IsString() @MaxLength(160) label?: string;
}

export class EligibilityRuleDto {
  @IsOptional() @IsArray() @Type(() => Number) @IsInt({ each: true })
  graduationYears?: number[];

  @IsOptional() @IsArray() @IsUUID('4', { each: true }) allowedBranchIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allowedCanonicalKeys?: string[];
  @IsOptional() @IsBoolean() allowAllBranches?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10) minimumCGPA?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minimum10thPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minimum12thPercentage?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maximumActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maximumHistoricalBacklogs?: number;
  @IsOptional() @IsBoolean() allowHistoricalBacklogs?: boolean;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CustomRuleDto)
  custom?: CustomRuleDto[];
}

export class SetEligibilityDto {
  @IsOptional() @IsIn(['AND', 'OR']) combinator?: 'AND' | 'OR';
  @IsObject() @ValidateNested() @Type(() => EligibilityRuleDto) rule!: EligibilityRuleDto;
}

export class BranchCriterionDto {
  @IsString() @MaxLength(120) branchSelector!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10) minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTenthPct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTwelfthPct?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxHistoricalBacklogs?: number;
  @IsOptional() @IsBoolean() allowHistorical?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CustomRuleDto)
  custom?: CustomRuleDto[];
}

export class SetCriteriaDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BranchCriterionDto)
  criteria!: BranchCriterionDto[];
}

export class DriveCollegeScopeDto {
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) departmentIds?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) branchIds?: string[];
}

export class DriveCollegeDto {
  @IsUUID() collegeId!: string;
  @IsOptional() @ValidateNested() @Type(() => DriveCollegeScopeDto) scope?: DriveCollegeScopeDto;
}

export class SetDriveCollegesDto {
  @IsOptional() @IsBoolean() allColleges?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DriveCollegeDto)
  colleges?: DriveCollegeDto[];
}

export class CreateDriveDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsString() @MinLength(3) @MaxLength(220) title!: string;
  @IsString() @MinLength(2) @MaxLength(180) jobRole!: string;
  @IsString() @MinLength(20) @MaxLength(20000) description!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredSkills?: string[];
  @IsOptional() @IsIn(['full_time', 'part_time', 'contract', 'internship', 'freelance'])
  employmentType?: string;
  @IsOptional() @IsIn(['remote', 'hybrid', 'onsite']) workMode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;
  @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @IsOptional() @IsString() @MaxLength(180) location?: string;
  @IsOptional() @IsDateString() applicationOpenAt?: string;
  @IsOptional() @IsDateString() applicationCloseAt?: string;
  @IsOptional() @IsDateString() driveDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) vacancies?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredDocuments?: string[];
  @IsOptional() @IsArray() roundsTemplate?: Array<Record<string, unknown>>;
}

export class UpdateDriveDto {
  @IsOptional() @IsString() @MaxLength(220) title?: string;
  @IsOptional() @IsString() @MaxLength(180) jobRole?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredSkills?: string[];
  @IsOptional() @IsIn(['full_time', 'part_time', 'contract', 'internship', 'freelance']) employmentType?: string;
  @IsOptional() @IsIn(['remote', 'hybrid', 'onsite']) workMode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;
  @IsOptional() @IsString() @MaxLength(180) location?: string;
  @IsOptional() @IsDateString() applicationOpenAt?: string;
  @IsOptional() @IsDateString() applicationCloseAt?: string;
  @IsOptional() @IsDateString() driveDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) vacancies?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) requiredDocuments?: string[];
  @IsOptional() @IsArray() roundsTemplate?: Array<Record<string, unknown>>;
}

export class ApplicantFilterDto extends PaginationDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @Type(() => Number) @IsInt() graduationYear?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minCgpa?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsIn(['ELIGIBLE', 'NOT_ELIGIBLE', 'NEEDS_INFO']) eligibilityStatus?: string;
  @IsOptional() @IsString() roundKey?: string;
}

export class BulkStatusDto {
  @IsArray() @IsUUID('4', { each: true }) applicationIds!: string[];
  @IsIn(['SHORTLISTED', 'REJECTED', 'ON_HOLD', 'UNDER_REVIEW', 'FINAL_REVIEW'])
  status!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @IsOptional() @IsBoolean() notify?: boolean;
  @IsOptional() @IsString() @MaxLength(120) idempotencyKey?: string;
}

export class BulkNotifyDto {
  @IsArray() @IsUUID('4', { each: true }) applicationIds!: string[];
  @IsString() @MaxLength(220) title!: string;
  @IsString() @MaxLength(2000) message!: string;
  @IsOptional() @IsString() @MaxLength(120) idempotencyKey?: string;
}

export class ScheduleCampusInterviewDto {
  @IsIn(['technical', 'hr', 'managerial', 'assignment']) roundType!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(480) durationMins?: number;
  @IsOptional() @IsIn(['video', 'phone', 'offline']) mode?: string;
  @IsOptional() @IsUUID() interviewerId?: string;
}

export class ReleaseOfferDto {
  @IsUUID() applicationId!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctc?: number;
  @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @IsOptional() @IsString() @MaxLength(180) roleTitle?: string;
  @IsOptional() @IsString() @MaxLength(180) location?: string;
  @IsOptional() @IsDateString() joiningDate?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(500) letterPath?: string;
}

export class RespondOfferDto {
  @IsIn(['ACCEPTED', 'DECLINED']) response!: 'ACCEPTED' | 'DECLINED';
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ApplyDriveDto {
  @IsOptional() @IsUUID() resumeId?: string;
  @IsOptional() @IsString() @MaxLength(4000) coverLetter?: string;
}

export class EligibleStudentsDto extends PaginationDto {
  @IsOptional() @IsIn(['all', 'ELIGIBLE', 'NOT_ELIGIBLE', 'NEEDS_INFO']) status?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @Type(() => Number) @IsInt() graduationYear?: number;
}