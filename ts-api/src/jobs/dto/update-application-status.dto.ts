/* eslint-disable prettier/prettier */
  import { IsIn, IsOptional, IsString } from 'class-validator';

  export class UpdateApplicationStatusDto {
    @IsIn(['applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected'])
    status: string;

    @IsString() @IsOptional()
    recruiterNotes?: string;
  }