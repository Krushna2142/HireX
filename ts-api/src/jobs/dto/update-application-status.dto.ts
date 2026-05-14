/* eslint-disable prettier/prettier */
import { IsIn, IsOptional, IsString } from 'class-validator';

export const APPLICATION_STATUS_INPUTS = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_IN_PROGRESS',
  'INTERVIEW_PASSED',
  'INTERVIEW_FAILED',
  'FINAL_REVIEW',
  'OFFERED',
  'HIRED',
  'ON_HOLD',
  'WITHDRAWN',

  // legacy frontend aliases
  'applied',
  'reviewed',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'rejected',
  'hired',
  'on_hold',
  'withdrawn',
] as const;

export class UpdateApplicationStatusDto {
  @IsIn(APPLICATION_STATUS_INPUTS)
  status!: string;

  @IsString()
  @IsOptional()
  recruiterNotes?: string;
}