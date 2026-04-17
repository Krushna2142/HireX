<files>
<file name="ts-api\prisma\schema.prisma">
<![CDATA[
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters", "partialIndexes"]
}

datasource db {
  provider = "postgresql"
}

enum InterviewStage {
  APPLIED
  UNDER_REVIEW
  SHORTLISTED
  INTERVIEW_SCHEDULED
  INTERVIEW_IN_PROGRESS
  INTERVIEW_PASSED
  INTERVIEW_FAILED
  FINAL_REVIEW
  OFFERED
  HIRED
  REJECTED
  ON_HOLD
  WITHDRAWN
}

model Resume {
  id             String                 @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId         String                 @map("user_id") @db.Uuid
  content        String?                @map("content")
  embedding      Unsupported("vector")?
  status         String?                @default("processing")
  createdAt      DateTime?              @default(now()) @map("created_at") @db.Timestamptz(6)
  fileName       String?                @map("file_name")
  analysis       Json?
  rawFile        String?                @map("raw_file")
  fileBytes      Bytes?                 @map("file_bytes")
  garbagedAt     DateTime?              @map("garbaged_at") @db.Timestamptz(6)
  garbageReason  String?                @map("garbage_reason")
  applications   applications[]
  resumeAnalysis ResumeAnalysis?
  users          users                  @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([userId], map: "idx_resumes_user_id")
  @@index([status], map: "idx_resumes_status")
  @@index([garbagedAt], map: "idx_resumes_garbaged_at")
  @@map("resumes")
}

model ResumeAnalysis {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  resumeId        String    @unique @map("resume_id") @db.Uuid
  rawText         String    @map("raw_text")
  personalInfo    Json      @default("{}") @map("personal_info")
  workExperience  Json      @default("[]") @map("work_experience")
  education       Json      @default("[]")
  skills          Json      @default("[]")
  certifications  Json      @default("[]")
  projects        Json      @default("[]")
  languages       Json      @default("[]")
  experienceYears Float     @default(0) @map("experience_years")
  experienceLevel String    @default("junior") @map("experience_level")
  topSkills       String[]  @default([]) @map("top_skills")
  industryTags    String[]  @default([]) @map("industry_tags")
  trajectory      String?
  status          String    @default("pending")
  processedAt     DateTime? @map("processed_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  resume          Resume    @relation(fields: [resumeId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@map("resume_analyses")
}

model CandidateProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  headline           String?
  bio                String?
  photoUrl           String?  @map("photo_url")
  location           String?
  phone              String?
  availability       String   @default("immediate")
  targetRoles        String[] @default([]) @map("target_roles")
  targetIndustries   String[] @default([]) @map("target_industries")
  employmentTypes    String[] @default([]) @map("employment_types")
  workMode           String?  @map("work_mode")
  salaryMin          Int?     @map("salary_min")
  salaryMax          Int?     @map("salary_max")
  salaryCurrency     String   @default("USD") @map("salary_currency")
  salaryNegotiable   Boolean  @default(true) @map("salary_negotiable")
  willingToRelocate  Boolean  @default(false) @map("willing_to_relocate")
  preferredLocations String[] @default([]) @map("preferred_locations")
  currentTitle       String?  @map("current_title")
  currentCompany     String?  @map("current_company")
  experienceYears    Float?   @map("experience_years")
  experienceLevel    String?  @map("experience_level")
  topSkills          String[] @default([]) @map("top_skills")
  activeResumeId     String?  @map("active_resume_id") @db.Uuid
  isVisible          Boolean  @default(true) @map("is_visible")
  profileCompletion  Int      @default(0) @map("profile_completion")
  lastActiveAt       DateTime @default(now()) @map("last_active_at") @db.Timestamptz(6)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("candidate_profiles")
}

model RecruiterProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  title              String?
  photoUrl           String?  @map("photo_url")
  phone              String?
  linkedinUrl        String?  @map("linkedin_url")
  isVerified         Boolean  @default(false) @map("is_verified")
  companyName        String?  @map("company_name")
  companySize        String?  @map("company_size")
  companyIndustry    String[] @default([]) @map("company_industry")
  companyWebsite     String?  @map("company_website")
  companyLogoUrl     String?  @map("company_logo_url")
  companyDescription String?  @map("company_description")
  companyLocation    String?  @map("company_location")
  hiringRoles        String[] @default([]) @map("hiring_roles")
  typicalStack       String[] @default([]) @map("typical_stack")
  hiringVolume       String?  @map("hiring_volume")
  openToRemote       Boolean  @default(true) @map("open_to_remote")
  subscriptionTier   String   @default("free") @map("subscription_tier")
  monthlyViewLimit   Int      @default(50) @map("monthly_view_limit")
  viewsUsedThisMonth Int      @default(0) @map("views_used_this_month")
  profileCompletion  Int      @default(0) @map("profile_completion")
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("recruiter_profiles")
}

model Job {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recruiterId        String               @map("recruiter_id") @db.Uuid
  title              String
  description        String
  company            String
  location           String?
  work_mode          String?              @default("hybrid")
  employment_type    String?              @default("full_time")
  salary_min         Int?
  salary_max         Int?
  salary_currency    String?              @default("INR")
  required_skills    String[]             @default([])
  experience_min     Float?               @default(0)
  experience_max     Float?
  industry           String?
  status             String?              @default("active")
  applicant_count    Int?                 @default(0)
  createdAt          DateTime?            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime?            @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  source             String               @default("internal") @db.VarChar(20)
  external_id        String?              @unique @db.Text
  applyUrl           String?              @map("apply_url")
  expiresAt          DateTime?            @map("expires_at") @db.Timestamptz(6)
  sync_batch         String?              @db.VarChar(50)
  applications       applications[]
  recruiter          users                @relation(fields: [recruiterId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([expiresAt], map: "idx_jobs_expires_at")
  @@index([external_id], map: "idx_jobs_external_id")
  @@index([recruiterId], map: "idx_jobs_recruiter")
  @@index([recruiterId], map: "idx_jobs_recruiter_id")
  @@index([required_skills], map: "idx_jobs_skills", type: Gin)
  @@index([source], map: "idx_jobs_source")
  @@index([status], map: "idx_jobs_status")
  @@index([status, createdAt(sort: Desc)], map: "idx_jobs_status_created")
  @@index([status, source], map: "idx_jobs_status_src")
  @@map("jobs")
}

model JobApplication {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  jobId       String    @map("job_id") @db.Uuid
  candidateId String    @map("candidate_id")
  resumeId    String?   @map("resume_id") @db.Uuid
  status      String?   @default("applied")
  coverNote   String?   @map("cover_note")
  appliedAt   DateTime? @default(now()) @map("applied_at") @db.Timestamptz(6)
  updatedAt   DateTime? @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([jobId, candidateId])
  @@index([candidateId], map: "idx_job_applications_candidate")
  @@index([jobId, status], map: "idx_job_applications_job")
  @@map("job_applications")
}

model alerts {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id    String    @db.Uuid
  type       String
  title      String
  message    String
  metadata   Json?     @default("{}")
  read       Boolean?  @default(false)
  created_at DateTime? @default(now()) @db.Timestamptz(6)
  users      users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id, read], map: "idx_alerts_unread", where: raw("(read = false)"))
  @@index([user_id], map: "idx_alerts_user")
}

model applications {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_id          String    @db.Uuid
  candidate_id    String    @db.Uuid
  resume_id       String?   @db.Uuid
  match_score     Float?
  status          String?   @default("applied")
  cover_letter    String?
  recruiter_notes String?
  applied_at      DateTime? @default(now()) @db.Timestamptz(6)
  updated_at      DateTime? @default(now()) @db.Timestamptz(6)
  users           users     @relation(fields: [candidate_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  jobs            Job       @relation(fields: [job_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  resumes         Resume?   @relation(fields: [resume_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@unique([job_id, candidate_id])
  @@index([candidate_id], map: "idx_applications_cand")
  @@index([job_id], map: "idx_applications_job")
  @@index([status], map: "idx_applications_stat")
}

model interview_questions {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id         String             @db.Uuid
  question_number    Int
  question           String
  category           String?
  difficulty         String?            @default("medium")
  ideal_answer       String?
  user_answer        String?
  score              Float?
  feedback           String?
  time_taken_secs    Int?
  answered_at        DateTime?          @db.Timestamptz(6)
  created_at         DateTime?          @default(now()) @db.Timestamptz(6)
  interview_sessions interview_sessions @relation(fields: [session_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([session_id], map: "idx_questions_session")
}

model interview_sessions {
  id                  String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidate_id        String                @db.Uuid
  job_id              String?               @db.Uuid
  job_title           String
  company             String?
  session_type        String?               @default("technical")
  status              String?               @default("in_progress")
  overall_score       Float?
  total_questions     Int?                  @default(0)
  completed_at        DateTime?             @db.Timestamptz(6)
  created_at          DateTime?             @default(now()) @db.Timestamptz(6)
  interview_questions interview_questions[]
  users               users                 @relation(fields: [candidate_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([candidate_id], map: "idx_sessions_candidate")
}

model recruiter_interviews {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  application_id String         @unique @db.Uuid
  job_id         String         @db.Uuid
  candidate_id   String         @db.Uuid
  recruiter_id   String         @db.Uuid
  current_stage  InterviewStage @default(APPLIED)
  status_code    Int            @default(100)
  final_status   String?
  created_at     DateTime       @default(now()) @db.Timestamptz(6)
  updated_at     DateTime       @default(now()) @updatedAt @db.Timestamptz(6)

  @@index([recruiter_id, status_code], map: "idx_ri_recruiter_status")
  @@index([job_id, status_code], map: "idx_ri_job_status")
  @@index([candidate_id, created_at], map: "idx_ri_candidate_created")
}

model recruiter_interview_rounds {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interview_id     String    @db.Uuid
  round_number     Int
  round_type       String
  scheduled_at     DateTime? @db.Timestamptz(6)
  duration_mins    Int?      @default(45)
  mode             String?   @default("video")
  interviewer_id   String?   @db.Uuid
  meeting_provider String?   @default("internal")
  meeting_room_id  String?
  meeting_join_url String?
  result           String?   @default("pending")
  score            Float?
  feedback         String?
  notify_30_sent   Boolean   @default(false)
  notify_15_sent   Boolean   @default(false)
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @updatedAt @db.Timestamptz(6)

  // Relation to the interview_rooms table created below. This keeps the
  // meeting_room_id column for backward compatibility while providing a
  // Prisma-level relation to the canonical rooms table.
  meetingRoom      interview_rooms? @relation(fields: [meeting_room_id], references: [id])

  @@unique([interview_id, round_number])
  @@index([scheduled_at], map: "idx_rir_scheduled")
  @@index([interview_id], map: "idx_rir_interview")
}

model recruiter_interview_events {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interview_id  String   @db.Uuid
  actor_user_id String?  @db.Uuid
  event_type    String
  from_stage    String?
  to_stage      String?
  metadata      Json     @default("{}")
  created_at    DateTime @default(now()) @db.Timestamptz(6)

  @@index([interview_id, created_at], map: "idx_rie_interview_created")
}

model users {
  id                 String               @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  full_name          String
  email              String               @unique
  password_hash      String?
  reset_token        String?
  reset_token_expiry DateTime?            @db.Timestamptz(6)
  created_at         DateTime?            @default(now()) @db.Timestamptz(6)
  role               String               @default("candidate")
  alerts             alerts[]
  applications       applications[]
  interview_sessions interview_sessions[]
  jobs               Job[]
  resumes            Resume[]

  @@index([email], map: "idx_users_email")
  @@index([reset_token], map: "idx_users_reset_token")
  @@index([role], map: "idx_users_role")
}

// ----------------------------- Interview Models ---------------------------

model interview_rooms {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recruiter_round_id    String?  @map("recruiter_round_id") @db.Uuid
  session_id            String?  @map("session_id") @db.Uuid
  room_name             String?  @map("room_name")
  provider              String?  @default("internal")
  provider_room_id      String?  @map("provider_room_id")
  max_participants      Int?     @default(4) @map("max_participants")
  mode                  String?  @default("video")
  is_locked             Boolean  @default(false) @map("is_locked")
  host_user_id          String?  @map("host_user_id") @db.Uuid
  join_url              String?  @map("join_url")
  started_at            DateTime? @map("started_at") @db.Timestamptz(6)
  ended_at              DateTime? @map("ended_at") @db.Timestamptz(6)
  metadata              Json?    @default("{}")
  created_at            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  participants          room_participants[]

  @@map("interview_rooms")
  @@index([host_user_id], map: "idx_interview_rooms_host")
  @@index([recruiter_round_id], map: "idx_interview_rooms_round")
  recruiterInterviewRounds recruiter_interview_rounds[]
}

model room_participants {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  room_id        String   @map("room_id") @db.Uuid
  user_id        String   @map("user_id") @db.Uuid
  role           String?  @default("participant")
  display_name   String?  @map("display_name")
  joined_at      DateTime @default(now()) @map("joined_at") @db.Timestamptz(6)
  left_at        DateTime? @map("left_at") @db.Timestamptz(6)
  is_muted       Boolean  @default(false) @map("is_muted")
  is_video_off   Boolean  @default(false) @map("is_video_off")
  raised_hand    Boolean  @default(false) @map("raised_hand")
  rtc_client_id  String?  @map("rtc_client_id")
  metadata       Json?    @default("{}")

  media_state    media_states? @relation(fields: [id], references: [participant_id])

  @@map("room_participants")
  @@index([room_id], map: "idx_room_participants_room")
  @@index([user_id], map: "idx_room_participants_user")
  interviewRooms interview_rooms[]
}

model media_states {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  participant_id  String   @map("participant_id") @db.Uuid @unique
  audio_enabled   Boolean  @default(true) @map("audio_enabled")
  video_enabled   Boolean  @default(true) @map("video_enabled")
  screen_sharing  Boolean  @default(false) @map("screen_sharing")
  last_updated    DateTime @default(now()) @updatedAt @map("last_updated") @db.Timestamptz(6)
  bandwidth_kbps  Int?     @map("bandwidth_kbps")
  resolution      String?  @map("resolution")
  metadata        Json?    @default("{}")

  @@map("media_states")
  @@index([participant_id], map: "idx_media_states_participant")
  roomParticipants room_participants[]
}

model interview_transcripts {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id    String?  @map("session_id") @db.Uuid
  participant_id String? @map("participant_id") @db.Uuid
  content       String
  timestamp     DateTime @default(now()) @map("timestamp") @db.Timestamptz(6)
  source        String?  @default("local")
  confidence    Float?
  is_final      Boolean  @default(false) @map("is_final")
  created_at    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_transcripts")
  @@index([session_id], map: "idx_transcripts_session")
}

model interview_scorecards {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id  String   @map("session_id") @db.Uuid
  created_by  String   @map("created_by") @db.Uuid
  rubric      Json?    @default("{}")
  total_score Float?   @map("total_score")
  comments    String?
  created_at  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("interview_scorecards")
  @@index([session_id], map: "idx_scorecards_session")
}

model interview_chat_messages {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  room_id      String   @map("room_id") @db.Uuid
  session_id   String?  @map("session_id") @db.Uuid
  sender_id    String   @map("sender_id") @db.Uuid
  message      String
  message_type String?  @default("text") @map("message_type")
  file_url     String?  @map("file_url")
  metadata     Json?    @default("{}")
  created_at   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_chat_messages")
  @@index([room_id], map: "idx_chat_room")
  @@index([session_id], map: "idx_chat_session")
}

model interview_events_log {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  session_id    String?  @map("session_id") @db.Uuid
  room_id       String?  @map("room_id") @db.Uuid
  actor_user_id String?  @map("actor_user_id") @db.Uuid
  event_type    String
  payload       Json?    @default("{}")
  created_at    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("interview_events_log")
  @@index([session_id], map: "idx_events_session")
  @@index([room_id], map: "idx_events_room")
}

]]>
</file>
<file name="ts-api\src\database\database.service.ts">
<![CDATA[
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('database.connectionString');

    if (!connectionString) {
      throw new Error(
        '[DatabaseService] DATABASE_URL is not set. ' +
        'Ensure the environment variable is configured in your deployment.',
      );
    }

    // ── Strip sslmode from the connection string so pg Pool config controls SSL ──
    // Supabase pooler URLs include ?sslmode=require which causes pg to attempt
    // full certificate verification — conflicting with rejectUnauthorized: false.
    // We remove it from the URL and handle SSL entirely via the pool config object.
    const cleanConnectionString = connectionString
      .replace(/[?&]sslmode=[^&]*/g, '')   // remove sslmode param
      .replace(/[?&]ssl=[^&]*/g, '')        // remove ssl param (if present)
      .replace(/\?$/, '');                  // clean trailing ? if it was the only param

    this.pool = new Pool({
      connectionString: cleanConnectionString,
      ssl: {
        rejectUnauthorized: false,  // ← Supabase uses self-signed intermediate CA
      },
      max:                    10,
      idleTimeoutMillis:   30_000,
      connectionTimeoutMillis: 5_000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected pg pool error: ${err.message}`, err.stack);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('✅ Database connection established successfully.');
    } catch (error) {
      this.logger.error(
        `[FATAL] Cannot connect to database: ${(error as Error).message}`,
        (error as Error).stack,
      );
      process.exit(1);
    }
  }

  async query<T extends QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start  = Date.now();
    const client = await this.pool.connect();

    try {
      const result   = await client.query<T>(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${text.substring(0, 100)}...`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Query failed: ${(error as Error).message}\nSQL: ${text.substring(0, 200)}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Transaction rolled back: ${(error as Error).message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed.');
  }
}

]]>
</file>
<file name="ts-api\src\interviews\candidate-interviews.controller.ts">
<![CDATA[
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';

@Controller('candidate/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('candidate')
export class CandidateInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  listMy(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.interviewsService.listCandidateInterviews(req.user.id, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.interviewsService.getCandidateInterview(req.user.id, id);
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview-reminders.service.ts">
<![CDATA[
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InterviewRemindersService {
  private readonly logger = new Logger(InterviewRemindersService.name);

  constructor(private readonly db: DatabaseService) {}

  @Cron('* * * * *')
  async sendUpcomingReminders() {
    await this.processReminderWindow(30, 'notify_30_sent');
    await this.processReminderWindow(15, 'notify_15_sent');
  }

  private async processReminderWindow(minutes: number, flagColumn: 'notify_30_sent' | 'notify_15_sent') {
    const { rows } = await this.db.query<any>(
      `SELECT r.*, i.candidate_id, i.recruiter_id, j.title AS job_title, u.email AS candidate_email
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       LEFT JOIN jobs j ON j.id = i.job_id
       LEFT JOIN users u ON u.id = i.candidate_id
       WHERE r.scheduled_at IS NOT NULL
         AND r.${flagColumn} = false
         AND r.scheduled_at > NOW()
         AND r.scheduled_at <= NOW() + ($1 || ' minutes')::interval`,
      [minutes],
    );

    for (const row of rows) {
      const title = `Interview starts in ${minutes} minutes`;
      const message = `${row.round_type} interview for ${row.job_title ?? 'your application'} starts soon.`;

      // in-app/device notification (alerts)
      await this.db.query(
        `INSERT INTO alerts (user_id, type, title, message, metadata)
         VALUES ($1, 'interview_reminder', $2, $3, $4::jsonb),
                ($5, 'interview_reminder', $2, $3, $4::jsonb)`,
        [
          row.candidate_id,
          title,
          message,
          JSON.stringify({ roundId: row.id, joinUrl: row.meeting_join_url, scheduledAt: row.scheduled_at }),
          row.recruiter_id,
        ],
      );

      // Email integration point (plug your mailer here)
      this.logger.log(`[EMAIL:${minutes}m] to=${row.candidate_email} subject="${title}"`);

      await this.db.query(
        `UPDATE recruiter_interview_rounds SET ${flagColumn} = true WHERE id = $1`,
        [row.id],
      );
    }
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview-room.controller.ts">
<![CDATA[
import { Controller, Get, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('interviews/room')
@UseGuards(JwtAuthGuard)
export class InterviewRoomController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get(':roomId/access')
  async access(@Req() req: any, @Param('roomId') roomId: string) {
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      req.user.id,
      req.user.role,
    );
    if (!access.allowed) throw new ForbiddenException('Not allowed to join this room');
    return access;
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interview.gateway.ts">
<![CDATA[
/// <reference lib="dom" />
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InterviewsService } from './interviews.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string;
  role: string;
  full_name?: string;
};

type RoomParticipant = {
  userId: string;
  socketId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
};

type RoomMeta = {
  interviewId: string;
  roundId: string;
  hostUserId: string;
  endedAt: number | null;
};

type SDP = RTCSessionDescriptionInit;
type ICECandidate = RTCIceCandidateInit;

// ─────────────────────────────────────────────────────────────────────────────
// InterviewGateway
//
// Handles all WebRTC signaling for interview rooms:
//   - Authentication via JWT on connection
//   - Room join/leave with access validation
//   - SDP offer/answer relay
//   - ICE candidate relay
//   - Media state sync (mic/cam/screen)
//   - In-room text chat
//   - Reconnection handling (duplicate socket → same user)
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: true,          // Reflect request origin — lock down in production
    credentials: true,
  },
  transports: ['websocket'],
  pingInterval: 10_000,
  pingTimeout: 5_000,
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(InterviewGateway.name);

  // roomId → Map<userId, RoomParticipant>
  private readonly rooms = new Map<string, Map<string, RoomParticipant>>();

  // roomId → metadata used for waiting room and host-only controls
  private readonly roomMeta = new Map<string, RoomMeta>();

  // socketId → AuthUser (for fast disconnect lookup)
  private readonly socketUsers = new Map<string, AuthUser>();

  // userId → Set<socketId> (for reconnection handling: one user may have multiple sockets briefly)
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Connection lifecycle ───────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        this.extractBearer(client.handshake.headers?.authorization as string | undefined);

      if (!token) {
        this.logger.warn(`[${client.id}] No auth token — disconnecting`);
        client.disconnect(true);
        return;
      }

      const decoded = await this.jwtService.verifyAsync<{
        sub?: string;
        id?: string;
        role: string;
        full_name?: string;
      }>(token);

      const user: AuthUser = {
        id: decoded.sub ?? decoded.id ?? '',
        role: decoded.role,
        full_name: decoded.full_name,
      };

      if (!user.id) {
        client.disconnect(true);
        return;
      }

      (client as any).user = user;
      this.socketUsers.set(client.id, user);

      // Track all sockets for this user (handles reconnect)
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      this.logger.debug(`[${client.id}] Connected: ${user.id} (${user.role})`);
    } catch (err) {
      this.logger.warn(`[${client.id}] Auth failed: ${String(err)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    this.socketUsers.delete(client.id);

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(user.id);
    }

    // Remove from all rooms this socket was in
    for (const [roomId, participants] of this.rooms.entries()) {
      const participant = participants.get(user.id);
      // Only remove if THIS socket was the active one for this user
      if (participant && participant.socketId === client.id) {
        // Check if user reconnected with a different socket already
        const activeSockets = this.userSockets.get(user.id);
        if (!activeSockets || activeSockets.size === 0) {
          participants.delete(user.id);
          client.to(roomId).emit('interview:user-left', { userId: user.id });
          this.emitRoomStatus(roomId);
          this.logger.debug(`[room:${roomId}] ${user.id} left (disconnect)`);

          if (participants.size === 0) {
            this.rooms.delete(roomId);
            this.roomMeta.delete(roomId);
            this.logger.debug(`[room:${roomId}] Empty — cleaned up`);
          }
        }
      }
    }
  }

  // ── Room management ────────────────────────────────────────────────────────

  @SubscribeMessage('interview:join-room')
  async onJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; name?: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return this.sendError(client, 'Unauthenticated');

    const { roomId } = body;
    if (!roomId) return this.sendError(client, 'roomId required');

    // Validate that this user has access to this room
    const access = await this.interviewsService.validateRoomAccess(
      roomId,
      user.id,
      user.role,
    );

    if (!access.allowed) {
      return this.sendError(client, 'Forbidden: you do not have access to this room');
    }

    await client.join(roomId);

    // Get or create room participant map
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    const participants = this.rooms.get(roomId)!;

    const participant: RoomParticipant = {
      userId: user.id,
      socketId: client.id,
      name: body.name ?? user.full_name,
      role: user.role,
      micOn: true,
      camOn: true,
      screenSharing: false,
      joinedAt: Date.now(),
    };

    if (access.allowed && access.interviewId && access.roundId && access.hostUserId) {
      const existingMeta = this.roomMeta.get(roomId);
      this.roomMeta.set(roomId, {
        interviewId: access.interviewId,
        roundId: access.roundId,
        hostUserId: existingMeta?.hostUserId ?? access.hostUserId,
        endedAt: existingMeta?.endedAt ?? null,
      });
    }

    participants.set(user.id, participant);

    // Send current participant list to the joiner
    const allParticipants = Array.from(participants.values());
    client.emit('interview:room-snapshot', {
      participants: allParticipants.map(p => this.serializeParticipant(p)),
    });

    // Notify existing participants
    client.to(roomId).emit('interview:user-joined', {
      participant: this.serializeParticipant(participant),
    });

    this.emitRoomStatus(roomId);

    if (user.role === 'recruiter' && access.allowed && access.interviewId && access.roundId) {
      void this.interviewsService.markRoomStarted(access.interviewId, access.roundId, user.id);
    }

    this.logger.log(`[room:${roomId}] ${user.id} (${user.role}) joined — ${participants.size} total`);
  }

  @SubscribeMessage('interview:leave-room')
  async onLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const { roomId } = body;
    await client.leave(roomId);

    const participants = this.rooms.get(roomId);
    if (participants) {
      participants.delete(user.id);
      client.to(roomId).emit('interview:user-left', { userId: user.id });
      this.emitRoomStatus(roomId);
      if (participants.size === 0) this.rooms.delete(roomId);
      if (participants.size === 0) this.roomMeta.delete(roomId);
    }

    this.logger.debug(`[room:${roomId}] ${user.id} left voluntarily`);
  }

  // ── WebRTC signaling relay ─────────────────────────────────────────────────
  // These are pure relay events — the gateway never inspects SDP/ICE content.
  // It only validates auth and routes to the correct target socket.

  @SubscribeMessage('interview:offer')
  onOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:offer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:answer')
  onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; sdp: SDP },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:answer', {
      fromUserId: user.id,
      sdp: body.sdp,
    });
  }

  @SubscribeMessage('interview:ice-candidate')
  onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; targetUserId: string; candidate: ICECandidate },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    this.relayToUser(body.roomId, body.targetUserId, 'interview:ice-candidate', {
      fromUserId: user.id,
      candidate: body.candidate,
    });
  }

  // ── Media state ────────────────────────────────────────────────────────────

  @SubscribeMessage('interview:toggle-media')
  onToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {
      roomId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing?: boolean;
    },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const participants = this.rooms.get(body.roomId);
    if (participants?.has(user.id)) {
      const p = participants.get(user.id)!;
      p.micOn = body.micOn;
      p.camOn = body.camOn;
      p.screenSharing = body.screenSharing ?? false;
    }

    client.to(body.roomId).emit('interview:user-media-toggled', {
      userId: user.id,
      micOn: body.micOn,
      camOn: body.camOn,
      screenSharing: body.screenSharing ?? false,
    });
  }

  // ── In-room chat ───────────────────────────────────────────────────────────

  @SubscribeMessage('interview:chat-message')
  onChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; message: string },
  ): void {
    const user = this.getAuthUser(client);
    if (!user) return;

    const msg = body.message?.trim();
    if (!msg || msg.length > 2000) return; // Basic validation

    const participants = this.rooms.get(body.roomId);
    const participant = participants?.get(user.id);

    this.server.to(body.roomId).emit('interview:chat-message', {
      userId: user.id,
      name: participant?.name ?? user.full_name ?? 'Participant',
      role: participant?.role ?? user.role,
      message: msg,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Heartbeat / ping ───────────────────────────────────────────────────────

  @SubscribeMessage('interview:ping')
  onPing(@ConnectedSocket() client: Socket): void {
    client.emit('interview:pong', { ts: Date.now() });
  }

  @SubscribeMessage('interview:end-room')
  async onEndRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = this.getAuthUser(client);
    if (!user) return;

    const roomId = body?.roomId;
    if (!roomId) return this.sendError(client, 'roomId required');

    const access = await this.interviewsService.validateRoomAccessWithContext(roomId, user.id, user.role);
    if (!access.allowed) return this.sendError(client, 'Forbidden: cannot end room');

    const meta = this.roomMeta.get(roomId);
    const hostUserId = meta?.hostUserId ?? access.hostUserId;
    const canEnd = user.role === 'recruiter' && !!hostUserId && hostUserId === user.id;
    if (!canEnd) return this.sendError(client, 'Only host can end interview');

    this.roomMeta.set(roomId, {
      interviewId: access.interviewId!,
      roundId: access.roundId!,
      hostUserId,
      endedAt: Date.now(),
    });

    this.server.to(roomId).emit('interview:room-ended', {
      roomId,
      endedBy: user.id,
      endedAt: new Date().toISOString(),
    });

    await this.interviewsService.markRoomEnded(access.interviewId!, access.roundId!, user.id);

    // Detach all sockets from this room to guarantee hard end.
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(roomId);
        }
      }
    }

    this.rooms.delete(roomId);
    this.roomMeta.delete(roomId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getAuthUser(client: Socket): AuthUser | null {
    return (client as any).user as AuthUser | null;
  }

  private sendError(client: Socket, message: string): void {
    client.emit('interview:error', { message });
  }

  /**
   * Relay a payload to a specific user in a room.
   * Finds the user's active socket by scanning the room adapter.
   */
  private relayToUser(
    roomId: string,
    targetUserId: string,
    event: string,
    payload: unknown,
  ): void {
    const roomSockets = this.server.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      const socketUser = socket ? this.socketUsers.get(socketId) : undefined;
      if (socketUser?.id === targetUserId && socket) {
        socket.emit(event, payload);
        return;
      }
    }
  }

  private serializeParticipant(p: RoomParticipant) {
    return {
      userId: p.userId,
      name: p.name,
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
      joinedAt: p.joinedAt,
    };
  }

  private emitRoomStatus(roomId: string): void {
    const participants = this.rooms.get(roomId);
    const meta = this.roomMeta.get(roomId);
    const hostPresent = !!meta?.hostUserId && !!participants?.has(meta.hostUserId);

    this.server.to(roomId).emit('interview:room-status', {
      roomId,
      hostUserId: meta?.hostUserId ?? null,
      hostPresent,
      participantCount: participants?.size ?? 0,
      ended: !!meta?.endedAt,
      endedAt: meta?.endedAt ? new Date(meta.endedAt).toISOString() : null,
    });
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader) return null;
    const m = /^Bearer\s+(.+)$/i.exec(authHeader);
    return m ? m[1] : null;
  }

  // ── Room inspection (for admin/debugging) ─────────────────────────────────

  getRoomInfo(roomId: string) {
    const participants = this.rooms.get(roomId);
    return {
      roomId,
      participantCount: participants?.size ?? 0,
      participants: participants
        ? Array.from(participants.values()).map(p => this.serializeParticipant(p))
        : [],
    };
  }
}
]]>
</file>
<file name="ts-api\src\interviews\interviews.controller.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Controller, Post, Get, Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  InterviewsService,
  AnswerEvaluation,
  InterviewQuestionRow,
} from './interviews.service';

@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  // ── POST /interviews/sessions ─────────────────────────────────────────────

  @Post('sessions')
  startSession(
    @Req()               req: any,
    @Body('jobTitle')    jobTitle: string,
    @Body('company')     company: string,
    @Body('sessionType') sessionType: string,
    @Body('jobId')       jobId?: string,
  ) {
    return this.interviews.startSession(
      req.user.id,
      jobTitle,
      company,
      sessionType ?? 'technical',
      jobId,
    );
  }

  // ── POST /interviews/questions/:questionId/answer ─────────────────────────
  // Explicit return type — AnswerEvaluation is exported from service

  @Post('questions/:questionId/answer')
  submitAnswer(
    @Param('questionId')   questionId: string,
    @Req()                 req: any,
    @Body('answer')        answer: string,
    @Body('timeTakenSecs') timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    return this.interviews.submitAnswer(
      questionId,
      req.user.id,
      answer,
      timeTakenSecs,
    ) as Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }>;
  }

  // ── POST /interviews/sessions/:sessionId/complete ─────────────────────────

  @Post('sessions/:sessionId/complete')
  complete(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ) {
    return this.interviews.completeSession(sessionId, req.user.id);
  }

  // ── GET /interviews/sessions ──────────────────────────────────────────────

  @Get('sessions')
  history(@Req() req: any) {
    return this.interviews.getSessionHistory(req.user.id);
  }

  // ── GET /interviews/sessions/:sessionId ───────────────────────────────────
  // Explicit return type — InterviewQuestionRow is exported from service

  @Get('sessions/:sessionId')
  getSession(
    @Param('sessionId') sessionId: string,
    @Req()              req: any,
  ): Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }> {
    return this.interviews.getSession(
      sessionId,
      req.user.id,
    ) as Promise<{ session: Record<string, unknown>; questions: InterviewQuestionRow[] }>;
  }
}

]]>
</file>
<file name="ts-api\src\interviews\interviews.module.ts">
<![CDATA[
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

import { InterviewsController } from './interviews.controller';
import { InterviewGateway } from './interview.gateway';
import { InterviewsService } from './interviews.service';

import { RecruiterInterviewsController } from './recruiter-interviews.controller';
import { RecruiterInterviewsService } from './recruiter-interviews.service';

import { CandidateInterviewsController } from './candidate-interviews.controller';
import { InterviewRoomController } from './interview-room.controller';
import { InterviewRoomsController } from './interview-rooms.controller';
import { InterviewRoomsService } from './interview-rooms.service';

import { DatabaseModule } from '../database/datbase.module';

@Module({
  imports: [
    JwtModule.register({}),
    DatabaseModule, // required because RecruiterInterviewsService injects DatabaseService
  ],
  controllers: [
    InterviewsController,
    RecruiterInterviewsController,
    CandidateInterviewsController,
    InterviewRoomController,
    InterviewRoomsController,
  ],
  providers: [
    PrismaService,
    InterviewsService,
    RecruiterInterviewsService, // <-- missing provider (main crash reason)
    InterviewGateway,
    InterviewRoomsService,
  ],
  exports: [InterviewsService, RecruiterInterviewsService],
})
export class InterviewsModule {}
]]>
</file>
<file name="ts-api\src\interviews\interviews.service.ts">
<![CDATA[
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AnswerEvaluation = {
  score: number;
  feedback: string;
};

export type InterviewQuestionRow = {
  id: string;
  session_id: string;
  question_number: number;
  question: string;
  category: string | null;
  difficulty: string | null;
  ideal_answer: string | null;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
  time_taken_secs: number | null;
  answered_at: Date | null;
  created_at: Date | null;
};

type ScheduleRoundInput = {
  roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduledAt: string;
  durationMins?: number;
  mode?: 'video' | 'phone' | 'offline';
  interviewerId?: string;
};

type RoundResultInput = {
  result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
  score?: number;
  feedback?: string;
};

type RoomAccessResult = {
  allowed: boolean;
  reason?: 'invalid_room' | 'room_not_found' | 'forbidden' | 'room_link_expired';
  roomId?: string;
  interviewId?: string;
  roundId?: string;
  role?: string;
  userId?: string;
  hostUserId?: string;
  interviewStage?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
};

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 200,
  SHORTLISTED: 300,
  INTERVIEW_SCHEDULED: 400,
  INTERVIEW_IN_PROGRESS: 500,
  INTERVIEW_PASSED: 600,
  INTERVIEW_FAILED: 650,
  FINAL_REVIEW: 700,
  OFFERED: 800,
  HIRED: 900,
  REJECTED: 950,
  ON_HOLD: 120,
  WITHDRAWN: 980,
};

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────────────────────
  // MOCK INTERVIEW (used by interviews.controller.ts)
  // ───────────────────────────────────────────────────────────────────────────

  async startSession(
    userId: string,
    jobTitle: string,
    company: string,
    sessionType = 'technical',
    jobId?: string,
  ) {
    if (!jobTitle?.trim()) throw new BadRequestException('jobTitle is required');

    const session = await this.prisma.interview_sessions.create({
      data: {
        candidate_id: userId,
        job_id: jobId ?? null,
        job_title: jobTitle.trim(),
        company: company ?? null,
        session_type: sessionType ?? 'technical',
        status: 'in_progress',
        total_questions: 5,
      },
    });

    const starterQuestions = [
      {
        question_number: 1,
        question: `Tell me about yourself and your fit for ${jobTitle}.`,
        category: 'behavioral',
        difficulty: 'easy',
        ideal_answer: 'Structured summary of experience, strengths, and relevance to role.',
      },
      {
        question_number: 2,
        question: `Explain a challenging problem you solved in your recent project.`,
        category: 'problem_solving',
        difficulty: 'medium',
        ideal_answer: 'Context, challenge, action, result with measurable impact.',
      },
      {
        question_number: 3,
        question: `How do you ensure quality while delivering under deadlines?`,
        category: 'execution',
        difficulty: 'medium',
        ideal_answer: 'Testing, prioritization, tradeoff communication, risk mitigation.',
      },
      {
        question_number: 4,
        question: `Describe your approach to collaboration with cross-functional teams.`,
        category: 'communication',
        difficulty: 'easy',
        ideal_answer: 'Clear communication, ownership, conflict handling, alignment.',
      },
      {
        question_number: 5,
        question: `Why do you want to join this company?`,
        category: 'motivation',
        difficulty: 'easy',
        ideal_answer: 'Company alignment, role impact, growth path.',
      },
    ];

    await this.prisma.interview_questions.createMany({
      data: starterQuestions.map((q) => ({
        session_id: session.id,
        ...q,
      })),
    });

    return session;
  }

  async submitAnswer(
    questionId: string,
    userId: string,
    answer: string,
    timeTakenSecs: number,
  ): Promise<InterviewQuestionRow & { evaluation: AnswerEvaluation; idealAnswer: string }> {
    const q = await this.prisma.interview_questions.findUnique({
      where: { id: questionId },
      include: { interview_sessions: true },
    });

    if (!q) throw new NotFoundException('Question not found');
    if (q.interview_sessions.candidate_id !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const clean = (answer ?? '').trim();
    const len = clean.length;
    const score = Math.max(0, Math.min(100, Math.round((len / 280) * 100)));
    const feedback =
      len < 60
        ? 'Answer too short; add context, action, and result.'
        : len < 160
        ? 'Good start; include stronger measurable outcomes.'
        : 'Strong answer structure and detail.';

    const updated = await this.prisma.interview_questions.update({
      where: { id: questionId },
      data: {
        user_answer: clean,
        time_taken_secs: timeTakenSecs,
        answered_at: new Date(),
        score,
        feedback,
      },
    });

    return {
      ...(updated as InterviewQuestionRow),
      evaluation: { score, feedback },
      idealAnswer: q.ideal_answer ?? '',
    };
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const qs = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
    });

    const scored = qs.filter((x) => typeof x.score === 'number');
    const overall =
      scored.length > 0
        ? Number(
            (
              scored.reduce((sum, x) => sum + Number(x.score ?? 0), 0) / scored.length
            ).toFixed(2),
          )
        : null;

    return this.prisma.interview_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overall_score: overall,
        completed_at: new Date(),
      },
    });
  }

  async getSessionHistory(userId: string) {
    return this.prisma.interview_sessions.findMany({
      where: { candidate_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.interview_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const questions = await this.prisma.interview_questions.findMany({
      where: { session_id: sessionId },
      orderBy: { question_number: 'asc' },
    });

    return { session, questions };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECRUITER INTERVIEW PIPELINE
  // ───────────────────────────────────────────────────────────────────────────

  async listRecruiterInterviews(
    recruiterId: string,
    params?: { statusCode?: number; limit?: number },
  ) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        recruiter_id: recruiterId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const candidateIds = [...new Set(rows.map((r) => r.candidate_id))];

    const [jobs, users] = await Promise.all([
      this.prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, full_name: true, email: true },
      }),
    ]);

    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
      candidate_name: userMap.get(r.candidate_id)?.full_name ?? null,
      candidate_email: userMap.get(r.candidate_id)?.email ?? null,
    }));
  }

  async getRecruiterInterview(recruiterId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, candidate, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.users.findUnique({
        where: { id: row.candidate_id },
        select: { id: true, full_name: true, email: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      candidate_id: row.candidate_id,
      recruiter_id: row.recruiter_id,
      job_id: row.job_id,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      candidate_name: candidate?.full_name ?? null,
      candidate_email: candidate?.email ?? null,
      rounds,
    };
  }

  async scheduleRound(recruiterId: string, interviewId: string, payload: ScheduleRoundInput) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid scheduledAt');

    const lastRound = await this.prisma.recruiter_interview_rounds.findFirst({
      where: { interview_id: interviewId },
      orderBy: { round_number: 'desc' },
    });

    const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;
    const roomId = `jc-${interviewId}-r${nextRoundNumber}`;
    const joinUrl = `/interviews/room/${roomId}`;

    const round = await this.prisma.recruiter_interview_rounds.create({
      data: {
        interview_id: interviewId,
        round_number: nextRoundNumber,
        round_type: payload.roundType,
        scheduled_at: scheduledAt,
        duration_mins: payload.durationMins ?? 45,
        mode: payload.mode ?? 'video',
        interviewer_id: payload.interviewerId ?? recruiterId,
        meeting_provider: 'internal',
        meeting_room_id: roomId,
        meeting_join_url: joinUrl,
        result: 'pending',
      },
    });

    await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: 'INTERVIEW_SCHEDULED',
        status_code: STAGE_TO_CODE.INTERVIEW_SCHEDULED,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'round_scheduled',
        metadata: { round_id: round.id, round_number: round.round_number, room_id: roomId },
      },
    });

    return round;
  }

  async updateStage(recruiterId: string, interviewId: string, stage: string) {
    const interview = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, recruiter_id: recruiterId },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!(stage in STAGE_TO_CODE)) throw new BadRequestException('Invalid stage');

    const updated = await this.prisma.recruiter_interviews.update({
      where: { id: interviewId },
      data: {
        current_stage: stage as any,
        status_code: STAGE_TO_CODE[stage],
        final_status: ['HIRED', 'REJECTED', 'WITHDRAWN'].includes(stage)
          ? stage
          : interview.final_status,
      },
    });

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: recruiterId,
        event_type: 'stage_changed',
        from_stage: interview.current_stage,
        to_stage: stage,
      },
    });

    return updated;
  }

  async submitRoundResult(recruiterId: string, roundId: string, payload: RoundResultInput) {
    const round = await this.prisma.recruiter_interview_rounds.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException('Round not found');

    const interview = await this.prisma.recruiter_interviews.findUnique({
      where: { id: round.interview_id },
    });
    if (!interview || interview.recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const updatedRound = await this.prisma.recruiter_interview_rounds.update({
      where: { id: roundId },
      data: {
        result: payload.result,
        score: payload.score ?? null,
        feedback: payload.feedback ?? null,
      },
    });

    if (payload.result === 'pass') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_PASSED',
          status_code: STAGE_TO_CODE.INTERVIEW_PASSED,
        },
      });
    } else if (payload.result === 'fail') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interview.id },
        data: {
          current_stage: 'INTERVIEW_FAILED',
          status_code: STAGE_TO_CODE.INTERVIEW_FAILED,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interview.id,
        actor_user_id: recruiterId,
        event_type: 'round_result_submitted',
        metadata: { round_id: roundId, result: payload.result, score: payload.score ?? null },
      },
    });

    return updatedRound;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CANDIDATE VIEWS
  // ───────────────────────────────────────────────────────────────────────────

  async listCandidateInterviews(candidateId: string, params?: { statusCode?: number; limit?: number }) {
    const rows = await this.prisma.recruiter_interviews.findMany({
      where: {
        candidate_id: candidateId,
        ...(typeof params?.statusCode === 'number' ? { status_code: params.statusCode } : {}),
      },
      orderBy: { updated_at: 'desc' },
      take: params?.limit ?? 30,
    });

    if (!rows.length) return [];

    const jobIds = [...new Set(rows.map((r) => r.job_id))];
    const jobs = await this.prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, title: true, company: true },
    });
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    return rows.map((r) => ({
      id: r.id,
      current_stage: r.current_stage,
      status_code: r.status_code,
      final_status: r.final_status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      job_title: jobMap.get(r.job_id)?.title ?? null,
      company: jobMap.get(r.job_id)?.company ?? null,
    }));
  }

  async getCandidateInterview(candidateId: string, interviewId: string) {
    const row = await this.prisma.recruiter_interviews.findFirst({
      where: { id: interviewId, candidate_id: candidateId },
    });
    if (!row) throw new NotFoundException('Interview not found');

    const [job, rounds] = await Promise.all([
      this.prisma.job.findUnique({
        where: { id: row.job_id },
        select: { id: true, title: true, company: true },
      }),
      this.prisma.recruiter_interview_rounds.findMany({
        where: { interview_id: row.id },
        orderBy: { round_number: 'asc' },
      }),
    ]);

    return {
      id: row.id,
      current_stage: row.current_stage,
      status_code: row.status_code,
      final_status: row.final_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      rounds,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ROOM ACCESS VALIDATION
  // ───────────────────────────────────────────────────────────────────────────

  async validateRoomAccess(roomId: string, userId: string, role: string) {
    return this.validateRoomAccessWithContext(roomId, userId, role);
  }

  async validateRoomAccessWithContext(roomId: string, userId: string, role: string): Promise<RoomAccessResult> {
    const m = /^jc-([a-f0-9-]+)-r(\d+)$/i.exec(roomId);
    if (!m) return { allowed: false, reason: 'invalid_room' };

    const interviewId = m[1];
    const roundNumber = Number(m[2]);

    const [interview, round] = await Promise.all([
      this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } }),
      this.prisma.recruiter_interview_rounds.findFirst({
        where: { interview_id: interviewId, round_number: roundNumber },
      }),
    ]);

    if (!interview || !round) return { allowed: false, reason: 'room_not_found' };

    const isCandidate = role === 'candidate' && interview.candidate_id === userId;
    const isRecruiter = role === 'recruiter' && interview.recruiter_id === userId;
    if (!isCandidate && !isRecruiter) return { allowed: false, reason: 'forbidden' };

    // Expiring room URL policy:
    // Join opens 30 minutes before schedule and expires 2 hours after round end.
    if (round.scheduled_at) {
      const scheduledAt = round.scheduled_at.getTime();
      const durationMs = (round.duration_mins ?? 45) * 60 * 1000;
      const startsAtMs = scheduledAt - 30 * 60 * 1000;
      const expiresAtMs = scheduledAt + durationMs + 2 * 60 * 60 * 1000;
      const now = Date.now();

      if (now < startsAtMs || now > expiresAtMs) {
        return {
          allowed: false,
          reason: 'room_link_expired',
          roomId,
          interviewId,
          roundId: round.id,
          role,
          userId,
          hostUserId: interview.recruiter_id,
          interviewStage: interview.current_stage,
          scheduledAt: round.scheduled_at.toISOString(),
          expiresAt: new Date(expiresAtMs).toISOString(),
        };
      }
    }

    return {
      allowed: true,
      roomId,
      interviewId,
      roundId: round.id,
      role,
      userId,
      hostUserId: interview.recruiter_id,
      interviewStage: interview.current_stage,
      scheduledAt: round.scheduled_at ? round.scheduled_at.toISOString() : null,
      expiresAt: round.scheduled_at
        ? new Date(round.scheduled_at.getTime() + ((round.duration_mins ?? 45) + 120) * 60 * 1000).toISOString()
        : null,
    };
  }

  async markRoomStarted(interviewId: string, roundId: string, actorUserId: string) {
    const interview = await this.prisma.recruiter_interviews.findUnique({ where: { id: interviewId } });
    if (!interview) return;

    if (interview.current_stage !== 'INTERVIEW_IN_PROGRESS') {
      await this.prisma.recruiter_interviews.update({
        where: { id: interviewId },
        data: {
          current_stage: 'INTERVIEW_IN_PROGRESS',
          status_code: STAGE_TO_CODE.INTERVIEW_IN_PROGRESS,
        },
      });
    }

    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_started',
        metadata: { round_id: roundId },
      },
    });
  }

  async markRoomEnded(interviewId: string, roundId: string, actorUserId: string) {
    await this.prisma.recruiter_interview_events.create({
      data: {
        interview_id: interviewId,
        actor_user_id: actorUserId,
        event_type: 'room_ended',
        metadata: { round_id: roundId },
      },
    });
  }
}
]]>
</file>
<file name="ts-api\src\interviews\recruiter-interviews.controller.ts">
<![CDATA[
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecruiterInterviewsService, StageKey } from './recruiter-interviews.service';

@Controller('recruiter/interviews')
@UseGuards(JwtAuthGuard)
export class RecruiterInterviewsController {
  constructor(private readonly service: RecruiterInterviewsService) {}

  @Post(':applicationId/init')
  init(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.service.initInterview(applicationId, req.user.id);
  }

  @Post(':interviewId/rounds')
  scheduleRound(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body() body: {
      roundType: string;
      scheduledAt: string;
      durationMins?: number;
      mode?: string;
      interviewerId?: string;
    },
  ) {
    return this.service.scheduleRound(interviewId, req.user.id, body);
  }

  @Patch(':interviewId/stage')
  updateStage(
    @Param('interviewId') interviewId: string,
    @Req() req: any,
    @Body('stage') stage: StageKey,
  ) {
    return this.service.updateStage(interviewId, req.user.id, stage);
  }

  @Patch('rounds/:roundId/result')
  submitRoundResult(
    @Param('roundId') roundId: string,
    @Req() req: any,
    @Body() body: { result: string; score?: number; feedback?: string },
  ) {
    return this.service.submitRoundResult(roundId, req.user.id, body);
  }

  @Get('dashboard')
  dashboard(@Req() req: any, @Query('jobId') jobId?: string) {
    return this.service.getDashboard(req.user.id, jobId);
  }

  @Get(':interviewId')
  detail(@Param('interviewId') interviewId: string, @Req() req: any) {
    return this.service.getInterview(interviewId, req.user.id, req.user.role);
  }

  @Get()
  list(
    @Req() req: any,
    @Query('statusCode') statusCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listInterviews(req.user.id, req.user.role, {
      statusCode: statusCode ? Number(statusCode) : undefined,
      limit: limit ? Number(limit) : 20,
    });
  }
}
]]>
</file>
<file name="ts-api\src\interviews\recruiter-interviews.service.ts">
<![CDATA[
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database/database.service';

const STAGE_TO_CODE: Record<string, number> = {
  APPLIED: 100,
  UNDER_REVIEW: 110,
  SHORTLISTED: 120,
  INTERVIEW_SCHEDULED: 130,
  INTERVIEW_IN_PROGRESS: 140,
  INTERVIEW_PASSED: 150,
  INTERVIEW_FAILED: 160,
  FINAL_REVIEW: 170,
  OFFERED: 180,
  HIRED: 190,
  REJECTED: 900,
  ON_HOLD: 910,
  WITHDRAWN: 920,
};

export type StageKey = keyof typeof STAGE_TO_CODE;

@Injectable()
export class RecruiterInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly db: DatabaseService,
  ) {}

  async initInterview(applicationId: string, recruiterId: string) {
    const { rows } = await this.db.query<any>(
      `SELECT a.id, a.job_id, a.candidate_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND j.recruiter_id = $2`,
      [applicationId, recruiterId],
    );
    if (!rows.length) throw new NotFoundException('Application not found');

    const app = rows[0];

    await this.db.query(
      `INSERT INTO recruiter_interviews (application_id, job_id, candidate_id, recruiter_id, current_stage, status_code)
       VALUES ($1, $2, $3, $4, 'APPLIED', 100)
       ON CONFLICT (application_id) DO NOTHING`,
      [app.id, app.job_id, app.candidate_id, recruiterId],
    );

    const detail = await this.db.query(
      `SELECT * FROM recruiter_interviews WHERE application_id = $1`,
      [applicationId],
    );

    return detail.rows[0];
  }

  async scheduleRound(
    interviewId: string,
    recruiterId: string,
    payload: { roundType: string; scheduledAt: string; durationMins?: number; mode?: string; interviewerId?: string },
  ) {
    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1 AND recruiter_id = $2`,
      [interviewId, recruiterId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const n = await this.db.query<{ next_round: number }>(
      `SELECT COALESCE(MAX(round_number), 0) + 1 AS next_round
       FROM recruiter_interview_rounds
       WHERE interview_id = $1`,
      [interviewId],
    );
    const roundNumber = n.rows[0].next_round;

    const roomId = `jc-${interviewId.slice(0, 8)}-r${roundNumber}`;
    const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interviews/room/${roomId}`;

    const { rows } = await this.db.query(
      `INSERT INTO recruiter_interview_rounds
       (interview_id, round_number, round_type, scheduled_at, duration_mins, mode, interviewer_id, meeting_provider, meeting_room_id, meeting_join_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'internal',$8,$9)
       RETURNING *`,
      [
        interviewId,
        roundNumber,
        payload.roundType,
        payload.scheduledAt,
        payload.durationMins ?? 45,
        payload.mode ?? 'video',
        payload.interviewerId ?? null,
        roomId,
        joinUrl,
      ],
    );

    await this.updateStage(interviewId, recruiterId, 'INTERVIEW_SCHEDULED', true);
    return rows[0];
  }

  async updateStage(interviewId: string, actorUserId: string, stage: StageKey, skipAuth = false) {
    const code = STAGE_TO_CODE[stage];
    if (!code) throw new NotFoundException('Invalid stage');

    const interview = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!interview.rows.length) throw new NotFoundException('Interview not found');

    const current = interview.rows[0];
    if (!skipAuth && current.recruiter_id !== actorUserId) {
      throw new ForbiddenException('Not allowed');
    }

    const finalStatus =
      stage === 'REJECTED' ? 'rejected'
      : stage === 'HIRED' ? 'selected'
      : stage === 'SHORTLISTED' ? 'shortlisted'
      : stage === 'ON_HOLD' ? 'on_hold'
      : 'in_progress';

    const { rows } = await this.db.query(
      `UPDATE recruiter_interviews
       SET current_stage = $1, status_code = $2, final_status = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [stage, code, finalStatus, interviewId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, from_stage, to_stage, metadata)
       VALUES ($1, $2, 'STATUS_CHANGED', $3, $4, $5::jsonb)`,
      [interviewId, actorUserId, current.current_stage, stage, JSON.stringify({ statusCode: code })],
    );

    if (stage === 'REJECTED') {
      await this.garbageRejectedResume(current.candidate_id, current.application_id);
    }

    return rows[0];
  }

  async submitRoundResult(roundId: string, recruiterId: string, payload: { result: string; score?: number; feedback?: string }) {
    const check = await this.db.query<any>(
      `SELECT r.*, i.recruiter_id, i.id AS interview_id
       FROM recruiter_interview_rounds r
       JOIN recruiter_interviews i ON i.id = r.interview_id
       WHERE r.id = $1`,
      [roundId],
    );
    if (!check.rows.length) throw new NotFoundException('Round not found');
    if (check.rows[0].recruiter_id !== recruiterId) throw new ForbiddenException('Not allowed');

    const { rows } = await this.db.query(
      `UPDATE recruiter_interview_rounds
       SET result = $1, score = $2, feedback = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payload.result, payload.score ?? null, payload.feedback ?? null, roundId],
    );

    await this.db.query(
      `INSERT INTO recruiter_interview_events
       (interview_id, actor_user_id, event_type, metadata)
       VALUES ($1, $2, 'ROUND_COMPLETED', $3::jsonb)`,
      [check.rows[0].interview_id, recruiterId, JSON.stringify({ roundId, result: payload.result })],
    );

    return rows[0];
  }

  async getDashboard(recruiterId: string, jobId?: string) {
    const params: any[] = [recruiterId];
    let where = `WHERE recruiter_id = $1`;
    if (jobId) {
      params.push(jobId);
      where += ` AND job_id = $2`;
    }

    const { rows } = await this.db.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE current_stage='SHORTLISTED')::int as shortlisted,
         COUNT(*) FILTER (WHERE current_stage='REJECTED')::int as rejected,
         COUNT(*) FILTER (WHERE current_stage='INTERVIEW_SCHEDULED')::int as scheduled,
         COUNT(*) FILTER (WHERE current_stage='HIRED')::int as hired
       FROM recruiter_interviews
       ${where}`,
      params,
    );

    return rows[0];
  }

  async listInterviews(userId: string, role: string, opts: { statusCode?: number; limit?: number }) {
    const limit = Math.min(opts.limit ?? 20, 100);
    const params: any[] = [limit];
    let where = '';

    if (role === 'recruiter') {
      params.unshift(userId);
      where = `WHERE i.recruiter_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    } else {
      params.unshift(userId);
      where = `WHERE i.candidate_id = $1`;
      if (opts.statusCode) {
        params.push(opts.statusCode);
        where += ` AND i.status_code = $${params.length}`;
      }
    }

    const q = role === 'recruiter'
      ? `SELECT i.*, u.full_name as candidate_name, j.title as job_title
         FROM recruiter_interviews i
         LEFT JOIN users u ON u.id = i.candidate_id
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`
      : `SELECT i.*, j.title as job_title, j.company
         FROM recruiter_interviews i
         LEFT JOIN jobs j ON j.id = i.job_id
         ${where}
         ORDER BY i.updated_at DESC
         LIMIT $2`;

    const { rows } = await this.db.query(q, params);
    return rows;
  }

  async getInterview(interviewId: string, userId: string, role: string) {
    const { rows } = await this.db.query<any>(
      `SELECT * FROM recruiter_interviews WHERE id = $1`,
      [interviewId],
    );
    if (!rows.length) throw new NotFoundException('Interview not found');

    const i = rows[0];
    if (role === 'recruiter' && i.recruiter_id !== userId) throw new ForbiddenException('Not allowed');
    if (role !== 'recruiter' && i.candidate_id !== userId) throw new ForbiddenException('Not allowed');

    const rounds = await this.db.query(
      `SELECT * FROM recruiter_interview_rounds WHERE interview_id = $1 ORDER BY round_number`,
      [interviewId],
    );
    const events = await this.db.query(
      `SELECT * FROM recruiter_interview_events WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [interviewId],
    );

    return { interview: i, rounds: rounds.rows, events: events.rows };
  }

  private async garbageRejectedResume(candidateId: string, applicationId: string) {
    const app = await this.db.query<{ resume_id: string | null }>(
      `SELECT resume_id FROM applications WHERE id = $1`,
      [applicationId],
    );
    if (!app.rows.length || !app.rows[0].resume_id) return;

    const resumeId = app.rows[0].resume_id;

    await this.db.query(
      `UPDATE resumes
       SET status='garbaged',
           garbaged_at=NOW(),
           garbage_reason='rejected',
           content=NULL,
           file_bytes=NULL
       WHERE id = $1 AND user_id = $2`,
      [resumeId, candidateId],
    );

    await this.db.query(
      `UPDATE candidate_profiles
       SET active_resume_id = NULL
       WHERE user_id = $1 AND active_resume_id = $2`,
      [candidateId, resumeId],
    );
  }
}
]]>
</file>
<file name="ts-api\src\recruiters\dto\update-recruiter-profile.dto.ts">
<![CDATA[
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
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.controller.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { RecruitersService } from './recruiters.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Controller('recruiters')
export class RecruitersController {
  constructor(private readonly recruiters: RecruitersService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.recruiters.getEnrichedProfile(req.user.id);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateRecruiterProfileDto) {
    return this.recruiters.updateProfile(req.user.id, dto);
  }
}
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.module.ts">
<![CDATA[
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RecruitersService } from './recruiters.service';
import { RecruitersController } from './recruiters.controller';

@Module({
  controllers: [RecruitersController],
  providers: [RecruitersService],
  exports: [RecruitersService],
})
export class RecruitersModule {}
]]>
</file>
<file name="ts-api\src\recruiters\recruiters.service.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';

@Injectable()
export class RecruitersService {
  private readonly logger = new Logger(RecruitersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  // ── GET profile ──────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.prisma.recruiterProfile.create({
        data: { userId },
      });
    }

    return profile;
  }

  // ── GET enriched profile with live pipeline stats ────────────────────────

  async getEnrichedProfile(userId: string) {
    const profile = await this.getProfile(userId);

    // Aggregate live hiring pipeline stats across all active jobs
    const { rows: pipeline } = await this.db.query(
      `SELECT
         COUNT(DISTINCT j.id)                                    AS total_jobs,
         COUNT(a.id)                                             AS total_applications,
         COUNT(a.id) FILTER (WHERE a.status = 'applied')        AS new_applicants,
         COUNT(a.id) FILTER (WHERE a.status = 'shortlisted')    AS shortlisted,
         COUNT(a.id) FILTER (WHERE a.status = 'interview')      AS in_interview,
         COUNT(a.id) FILTER (WHERE a.status = 'offered')        AS offered,
         COUNT(a.id) FILTER (WHERE a.status = 'rejected')       AS rejected,
         COUNT(j.id) FILTER (WHERE j.status = 'active')         AS active_jobs,
         ROUND(
           CASE WHEN COUNT(a.id) FILTER (WHERE a.status = 'interview') > 0
             THEN COUNT(a.id) FILTER (WHERE a.status = 'offered')::NUMERIC
               / COUNT(a.id) FILTER (WHERE a.status = 'interview') * 100
             ELSE 0 END, 1
         )                                                       AS offer_rate,
         ROUND(
           AVG(
             EXTRACT(EPOCH FROM (a.updated_at - a.applied_at)) / 86400
           )::NUMERIC, 1
         )                                                       AS avg_days_to_hire
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.recruiter_id = $1`,
      [userId],
    );

    // Recent applicants across all jobs
    const { rows: recentApplicants } = await this.db.query(
      `SELECT
         a.id, a.status, a.match_score, a.applied_at,
         u.full_name, u.email,
         cp.headline, cp.experience_level, cp.top_skills,
         j.title AS job_title
       FROM applications a
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       JOIN jobs j ON j.id = a.job_id
       WHERE j.recruiter_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 8`,
      [userId],
    );

    return {
      ...profile,
      pipeline:          pipeline[0] || {},
      recentApplicants,
      profileCompletion: this.computeCompletion(profile),
    };
  }

  // ── UPDATE profile ───────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    await this.getProfile(userId);

    const updated = await this.prisma.recruiterProfile.update({
      where: { userId },
      data: {
        ...(dto.title              !== undefined && { title: dto.title }),
        ...(dto.phone              !== undefined && { phone: dto.phone }),
        ...(dto.photoUrl           !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.linkedinUrl        !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.companyName        !== undefined && { companyName: dto.companyName }),
        ...(dto.companySize        !== undefined && { companySize: dto.companySize }),
        ...(dto.companyIndustry    !== undefined && { companyIndustry: dto.companyIndustry }),
        ...(dto.companyWebsite     !== undefined && { companyWebsite: dto.companyWebsite }),
        ...(dto.companyLogoUrl     !== undefined && { companyLogoUrl: dto.companyLogoUrl }),
        ...(dto.companyDescription !== undefined && { companyDescription: dto.companyDescription }),
        ...(dto.companyLocation    !== undefined && { companyLocation: dto.companyLocation }),
        ...(dto.hiringRoles        !== undefined && { hiringRoles: dto.hiringRoles }),
        ...(dto.typicalStack       !== undefined && { typicalStack: dto.typicalStack }),
        ...(dto.hiringVolume       !== undefined && { hiringVolume: dto.hiringVolume }),
        ...(dto.openToRemote       !== undefined && { openToRemote: dto.openToRemote }),
        profileCompletion: this.computeCompletion({ ...dto }),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Recruiter profile updated: ${userId}`);
    return updated;
  }

  // ── Private: compute completion score ────────────────────────────────────

  private computeCompletion(profile: any): number {
    const checks = [
      !!profile.title,
      !!profile.phone,
      !!profile.linkedinUrl,
      !!profile.companyName,
      !!profile.companySize,
      !!profile.companyIndustry?.length,
      !!profile.companyWebsite,
      !!profile.companyDescription,
      !!profile.hiringRoles?.length,
      !!profile.typicalStack?.length,
    ];

    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );
  }
}
]]>
</file>
<file name="frontend\app\_components\profiles\CandidateProfilePage.tsx">
<![CDATA[
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/dashboard/page.tsx  —  Candidate Command Center
//
// What you see when you log in as a candidate:
//   • KPI row:  Total Applied / Active / Interviews / Offers
//   • Area chart: Application activity (last 14 days, derived from live data)
//   • Donut chart: Status breakdown
//   • Funnel bars: Hiring pipeline conversion
//   • Skills grid: Populated from resume AI analysis
//   • Activity feed: Recent applications with status badges
//
// Profile + Settings drawer:
//   • Opened by clicking the username card in the Sidebar (ProfilePanelContext)
//   • Also opened by the "Complete your profile" nudge card
//   • Rendered by <ProfilePanel /> which reads open state from context
//
// All data is real-time via SWR hooks — no mock data anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense }   from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth }               from '@/components/providers/AuthProvider';
import { useMyApplications, useAlerts, type ApplicationStatus } from '@/hooks/useRealTimeAlerts';
import { useCandidateProfile }   from '@/hooks/userProfile';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:     '#070B14',
  surface:'#0D1220',
  border: 'rgba(255,255,255,0.07)',
  muted:  'rgba(255,255,255,0.35)',
  faint:  'rgba(255,255,255,0.18)',
  sky:    '#38BDF8',
  purple: '#A78BFA',
  green:  '#10B981',
  teal:   '#34D399',
  amber:  '#FBBF24',
  red:    '#F87171',
  blue:   '#60A5FA',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Status metadata
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: `${C.blue}18`,   color: C.blue,   label: 'Applied'     },
  reviewed:    { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewed'    },
  reviewing:   { bg: `${C.amber}18`,  color: C.amber,  label: 'Reviewing'   },
  shortlisted: { bg: `${C.teal}18`,   color: C.teal,   label: 'Shortlisted' },
  interview:   { bg: `${C.purple}18`, color: C.purple, label: 'Interview'   },
  offered:     { bg: `${C.green}20`,  color: C.green,  label: 'Offered'     },
  rejected:    { bg: `${C.red}18`,    color: C.red,    label: 'Rejected'    },
  hired:       { bg: `${C.teal}25`,   color: '#059669',label: 'Hired'       },
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, ...extra,
});

function Pulse({ h = 14, w = '100%' }: { h?: number; w?: number | string }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />;
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ ...card({ padding: '1.25rem 1.5rem' }), display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <Pulse h={28} w={60} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.faint }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile completion ring (SVG donut)
// ─────────────────────────────────────────────────────────────────────────────

function CompletionRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  const color = score >= 80 ? C.green : score >= 50 ? C.sky : C.amber;
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width="68" height="68" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.faint }}>%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const { user }                      = useAuth();
  const { openPanel }                 = useProfilePanel();
  const { data: profile }             = useCandidateProfile();
  const { applications, loading }     = useMyApplications();
  const { unreadCount = 0 }           = useAlerts();

  // ── Derive all analytics from live application data ────────────────────────
  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalApps   = applications.length;
  const shortlisted = (statusCounts.shortlisted ?? 0) + (statusCounts.interview ?? 0);
  const interviews  = statusCounts.interview ?? 0;
  const offers      = (statusCounts.offered ?? 0) + (statusCounts.hired ?? 0);
  const activeApps  = totalApps - (statusCounts.rejected ?? 0);

  // Applications per day — last 14 days
  const appsByDay = (() => {
    const map: Record<string, number> = {};
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      map[d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })] = 0;
    }
    applications.forEach(a => {
      const key = new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  })();

  // Status donut data
  const statusDist = Object.entries(statusCounts).map(([status, count]) => ({
    status, count,
    color: STATUS_META[status as ApplicationStatus]?.color ?? C.muted,
  }));

  // Funnel
  const funnelRows = [
    { stage: 'Applied',     value: totalApps,   color: C.blue   },
    { stage: 'Active',      value: activeApps,  color: C.sky    },
    { stage: 'Shortlisted', value: shortlisted, color: C.purple },
    { stage: 'Interview',   value: interviews,  color: C.amber  },
    { stage: 'Offer',       value: offers,      color: C.green  },
  ];

  const completionScore = profile?.profileCompletion ?? 0;
  const topSkills       = (profile?.topSkills ?? []) as string[];
  const greeting        = profile?.headline
    ? `Hey, ${(profile.full_name ?? profile.headline).split(' ')[0]}`
    : `Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: C.bg }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── Welcome + profile nudge ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>{greeting}</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
            {totalApps} applications tracked ·{' '}
            {unreadCount > 0
              ? <span style={{ color: C.purple }}>{unreadCount} new alerts</span>
              : <span>all caught up ✓</span>
            }
          </p>
        </div>

        {/* Clickable profile completeness card → opens profile drawer */}
        <button
          onClick={openPanel}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px', cursor: 'pointer',
            ...card({
              border: completionScore < 60
                ? `1px solid ${C.amber}44`
                : `1px solid ${C.border}`,
              background: 'none',
            }),
            transition: 'border-color 0.2s',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          <CompletionRing score={completionScore} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
              Profile {completionScore}% complete
            </p>
            <p style={{ margin: 0, fontSize: 11, color: completionScore < 60 ? C.amber : C.muted }}>
              {completionScore < 60
                ? 'Complete to unlock better AI matches →'
                : completionScore < 90
                ? 'Almost done — click to finish →'
                : 'Profile looks great ✓'}
            </p>
          </div>
        </button>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.25rem' }}>
        <KpiCard label="Total Applied" value={totalApps}  color={C.blue}   icon="📋" loading={loading} />
        <KpiCard label="Active"        value={activeApps} color={C.sky}    icon="⚡" loading={loading} sub="not rejected" />
        <KpiCard label="Interviews"    value={interviews} color={C.amber}  icon="🎯" loading={loading} />
        <KpiCard label="Offers"        value={offers}     color={C.green}  icon="🎉" loading={loading} />
      </div>

      {/* ── Charts row 1: area chart + donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Application Activity — last 14 days</p>
          {loading ? <Pulse h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={appsByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.sky} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="count" name="Applications" stroke={C.sky} strokeWidth={2} fill="url(#cGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {statusDist.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see breakdown</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="count" nameKey="status">
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8 }}>
                {statusDist.map(s => (
                  <span key={s.status} style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    {s.status} ({s.count})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Charts row 2: funnel + skills ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Hiring Funnel</p>
          {totalApps === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: C.faint, textAlign: 'center' }}>Apply to jobs<br />to see your pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelRows.map(row => {
                const pct = totalApps > 0 ? Math.round((row.value / totalApps) * 100) : 0;
                return (
                  <div key={row.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.stage}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{row.value} <span style={{ color: C.faint }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: row.color, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={card({ padding: '1.25rem 1.5rem' })}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Your Top Skills</p>
          {topSkills.length === 0 ? (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>📄</span>
              <p style={{ fontSize: 12, color: C.faint, margin: 0, textAlign: 'center' }}>Upload &amp; analyse your resume<br />to see skill insights</p>
              <button onClick={openPanel} style={{ fontSize: 12, color: C.sky, background: 'none', border: `1px solid ${C.sky}33`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                Open Profile →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {topSkills.slice(0, 12).map((s, i) => (
                  <span key={s} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: `${C.purple}15`, border: `1px solid ${C.purple}33`, color: C.purple, fontWeight: i < 3 ? 700 : 400 }}>{s}</span>
                ))}
              </div>
              {profile?.experienceLevel && (
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                  <span style={{ color: C.sky, fontWeight: 600 }}>{profile.experienceLevel}</span>
                  {profile.experienceYears != null && ` · ${profile.experienceYears} years experience`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div style={card({ padding: '1.25rem 1.5rem' })}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Activity</p>
        {applications.length === 0 ? (
          <p style={{ fontSize: 13, color: C.faint, margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>
            No activity yet — apply to jobs to see updates here
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...applications]
              .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
              .slice(0, 8)
              .map(app => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        {(app as any).jobs?.title ?? 'Job Application'}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: C.faint }}>
                        {(app as any).jobs?.company ?? ''} · {fmtDate(app.applied_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`, flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export
// ─────────────────────────────────────────────────────────────────────────────

export default function CandidateDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#070B14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>
      <Suspense fallback={<div style={{ padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Loading dashboard…</div>}>
        <DashboardContent />
      </Suspense>

      {/* Profile + Settings drawer — opened by sidebar username card or profile nudge */}
      <ProfilePanel />
    </div>
  );
}
]]>
</file>
<file name="frontend\app\_components\profiles\RecruiterProfilePage.tsx">
<![CDATA[
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/(protected)/recruiter/dashboard/page.tsx
//
// Changes from the original (document 9) — minimal diff:
//   1. Added: import { ProfilePanel } from '@/components/ProfilePanel'
//   2. Added: <ProfilePanel /> at the bottom of the JSX tree
//   3. The "⚙ Profile" button in the header now calls openPanel() from context
//
// Everything else — DashboardTab, SkillPicker, PostJobForm, job list,
// applicant management, tab structure — is preserved exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  useRecruiterJobs,
  useJobApplicants,
  type RecruiterJob,
  type ApplicationStatus,
  type Application,
} from '@/hooks/useRealTimeAlerts';
import { useRecruiterAnalytics } from '@/hooks/useAnalytics';
import { useProfilePanel }       from '@/components/context/ProfilePanelContext';
import { ProfilePanel }          from '@/components/profile/ProfilePanel';

// ── Skill taxonomy ─────────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string[]> = {
  'Frontend':       ['React', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'CSS', 'HTML'],
  'Backend':        ['Node.js', 'NestJS', 'Express', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go', 'Rust'],
  'Database':       ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Supabase', 'Prisma'],
  'Cloud & DevOps': ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
  'AI / ML':        ['Python', 'TensorFlow', 'PyTorch', 'LangChain', 'OpenAI API', 'Hugging Face', 'MLOps'],
  'Mobile':         ['Flutter', 'React Native', 'Swift', 'Kotlin', 'iOS', 'Android'],
  'Tools':          ['Git', 'GraphQL', 'REST', 'gRPC', 'Kafka', 'Figma', 'Jira'],
};

type Tab = 'dashboard' | 'jobs' | 'post';

interface PostJobForm {
  title: string; company: string; location: string;
  work_mode: string; employment_type: string;
  description: string; required_skills: string[];
  salary_min: string; salary_max: string;
}

const EMPTY_FORM: PostJobForm = {
  title: '', company: '', location: '', work_mode: 'hybrid',
  employment_type: 'full_time', description: '',
  required_skills: [], salary_min: '', salary_max: '',
};

// ── Style constants ────────────────────────────────────────────────────────

const STATUS_META: Record<ApplicationStatus, { bg: string; color: string; label: string }> = {
  applied:     { bg: 'rgba(96,165,250,0.1)',  color: '#60A5FA', label: 'Applied'     },
  reviewed:    { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewed'    },
  reviewing:   { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24', label: 'Reviewing'   },
  shortlisted: { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', label: 'Shortlisted' },
  interview:   { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', label: 'Interview'   },
  offered:     { bg: 'rgba(52,211,153,0.15)', color: '#10B981', label: 'Offered'     },
  rejected:    { bg: 'rgba(248,113,113,0.1)', color: '#F87171', label: 'Rejected'    },
  hired:       { bg: 'rgba(52,211,153,0.2)',  color: '#059669', label: 'Hired'       },
};

const JOB_STATUS_STYLE: Record<RecruiterJob['status'], { bg: string; color: string; border: string }> = {
  active: { bg: 'rgba(52,211,153,0.1)',   color: '#34D399', border: 'rgba(52,211,153,0.25)'   },
  closed: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
  draft:  { bg: 'rgba(251,191,36,0.1)',   color: '#FBBF24', border: 'rgba(251,191,36,0.25)'   },
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#F1F5F9', fontSize: 13, outline: 'none',
  fontFamily: 'Sora, sans-serif',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', marginBottom: 7,
};

// ── Chart tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon, loading }: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; loading?: boolean;
}) {
  return (
    <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
        {loading
          ? <div style={{ height: 28, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 4, animation: 'raPulse 1.4s ease infinite' }} />
          : <p style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
        }
        {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Dashboard analytics tab ────────────────────────────────────────────────

function DashboardTab() {
  const { analytics, loading } = useRecruiterAnalytics();
  const { kpis, applicationsByStatus, applicationsOverTime, topJobs, recentApplications, skillDemand } = analytics;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', animation: 'rdFade 0.3s ease' }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <KpiCard label="Total Jobs Posted"  value={kpis.totalJobs}       color="#A78BFA" icon="💼" loading={loading} />
        <KpiCard label="Active Listings"    value={kpis.activeJobs}      color="#34D399" icon="✅" loading={loading} />
        <KpiCard label="Total Applicants"   value={kpis.totalApplicants} color="#60A5FA" icon="👥" loading={loading} />
        <KpiCard label="Shortlisted"        value={kpis.shortlisted}     color="#FBBF24" icon="⭐" loading={loading} />
        <KpiCard label="Hired"              value={kpis.hired}           color="#10B981" icon="🎉" loading={loading} />
        <KpiCard label="Avg. Time to Fill"  value={kpis.avgTimeToFill ? `${kpis.avgTimeToFill}d` : '—'} color="#F87171" icon="⏱️" sub="days from post to hire" loading={loading} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Applications Over Time</p>
          {applicationsOverTime.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={applicationsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="#A78BFA" strokeWidth={2} fill="url(#appGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>By Status</p>
          {applicationsByStatus.length === 0 && !loading
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={applicationsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {applicationsByStatus.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 4 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {applicationsByStatus.map((s: any) => (
                    <span key={s.status} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Top Jobs by Applicants</p>
          {topJobs.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topJobs} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="applicants"  name="Applicants"  fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={8} />
                  <Bar dataKey="shortlisted" name="Shortlisted" fill="#34D399" radius={[0, 4, 4, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Most Required Skills</p>
          {skillDemand.length === 0 && !loading
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No data yet</p></div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {skillDemand.slice(0, 6).map((s: any, i: number) => {
                  const pct = Math.round((s.count / (skillDemand[0]?.count || 1)) * 100);
                  return (
                    <div key={s.skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.skill}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.count} jobs</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: `hsl(${260 - i * 20}, 70%, 70%)`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Recent applications */}
      <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, background: '#0D1220', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ margin: '0 0 1.25rem', fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Recent Applications</p>
        {recentApplications.length === 0 && !loading
          ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center', padding: '1.5rem 0' }}>No applications yet</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentApplications.slice(0, 8).map((app: any) => {
                const meta = STATUS_META[app.status as ApplicationStatus] ?? STATUS_META.applied;
                return (
                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                      {app.candidateName?.slice(0, 2).toUpperCase() ?? 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidateName}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.jobTitle} · {fmtDate(app.appliedAt)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── SkillPicker (unchanged from original) ─────────────────────────────────

function SkillPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('');
  const [openCat, setOpenCat] = useState<string | null>('Frontend');
  const toggle = (skill: string) => onChange(selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill]);
  const addCustom = () => { const s = custom.trim(); if (s && !selected.includes(s)) { onChange([...selected, s]); setCustom(''); } };
  return (
    <div>
      {Object.entries(SKILL_CATEGORIES).map(([cat, skills]) => {
        const count  = skills.filter(s => selected.includes(s)).length;
        const isOpen = openCat === cat;
        return (
          <div key={cat} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
            <button type="button" onClick={() => setOpenCat(isOpen ? null : cat)} style={{ width: '100%', padding: '10px 14px', background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Sora, sans-serif' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isOpen ? '#A78BFA' : 'rgba(255,255,255,0.55)' }}>{cat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>{count} selected</span>}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>
            </button>
            {isOpen && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map(skill => {
                  const checked = selected.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggle(skill)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'Sora, sans-serif', border: `1px solid ${checked ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: checked ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: checked ? '#C4B5FD' : 'rgba(255,255,255,0.45)', fontWeight: checked ? 600 : 400, transition: 'all 0.15s' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${checked ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`, background: checked ? '#A78BFA' : 'transparent' }}>
                        {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      {skill}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} placeholder="Add custom skill…" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={addCustom} style={{ padding: '9px 16px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#A78BFA', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>Add</button>
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected ({selected.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {selected.map(skill => (
              <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#C4B5FD' }}>
                {skill}
                <button type="button" onClick={() => toggle(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 13, lineHeight: 1, padding: '0 0 0 2px', opacity: 0.6 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const [tab,           setTab]    = useState<Tab>('dashboard');
  const [selectedJobId, setJobId]  = useState<string | null>(null);
  const [form,          setForm]   = useState<PostJobForm>(EMPTY_FORM);
  const [formError,     setErr]    = useState<string | null>(null);
  const [postSuccess,   setOk]     = useState(false);
  const [posting,       setPosting]= useState(false);

  const { openPanel }                                                       = useProfilePanel();
  const { jobs, loading: loadingJobs, validating, postJob, toggleStatus }   = useRecruiterJobs();
  const { applicants, loading: loadingApps, updateStatus }                  = useJobApplicants(selectedJobId);

  const selectedJob     = jobs.find(j => j.id === selectedJobId);
  const totalApplicants = jobs.reduce((n, j) => n + (j._count?.applications ?? 0), 0);
  const activeJobs      = jobs.filter(j => j.status === 'active').length;

  const handlePost = async () => {
    setErr(null);
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) { setErr('Title, company, location and description are required.'); return; }
    if (form.required_skills.length === 0) { setErr('Select at least one required skill.'); return; }
    setPosting(true);
    try {
      await postJob({ title: form.title.trim(), company: form.company.trim(), location: form.location.trim(), workMode: form.work_mode, employmentType: form.employment_type, description: form.description.trim(), requiredSkills: form.required_skills, salaryMin: form.salary_min ? parseInt(form.salary_min, 10) : undefined, salaryMax: form.salary_max ? parseInt(form.salary_max, 10) : undefined });
      setOk(true); setForm(EMPTY_FORM);
      setTimeout(() => { setOk(false); setTab('jobs'); }, 2000);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed to post job.'); }
    finally { setPosting(false); }
  };

  const f = <K extends keyof PostJobForm>(key: K, val: PostJobForm[K]) => setForm(p => ({ ...p, [key]: val }));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'jobs',      label: '💼 My Jobs'   },
    { key: 'post',      label: '+ Post a Job' },
  ];

  return (
    <>
      <style>{`
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes raSpin  { to { transform:rotate(360deg); } }
        @keyframes rdFade  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        select option { background: #0F1526; color: #F1F5F9; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem 2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Recruitment</h1>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: validating ? '#34D399' : 'rgba(52,211,153,0.3)', boxShadow: validating ? '0 0 5px #34D399' : 'none', transition: 'background 0.3s', display: 'inline-block' }} />
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                {jobs.length} jobs · {totalApplicants} applicants · {activeJobs} active · live
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {/* ← NEW: Profile & Settings button opens the panel */}
              <button
                onClick={openPanel}
                style={{ padding: '9px 16px', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: 10, color: '#F472B6', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                ⚙ Profile &amp; Settings
              </button>

              <button
                onClick={() => setTab('post')}
                style={{ padding: '9px 20px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10, color: '#A78BFA', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Post a Job
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: tab === key ? 700 : 400, background: tab === key ? 'rgba(167,139,250,0.2)' : 'transparent', color: tab === key ? '#A78BFA' : 'rgba(255,255,255,0.4)', border: tab === key ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard tab */}
        {tab === 'dashboard' && <DashboardTab />}

        {/* Jobs tab */}
        {tab === 'jobs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', flex: 1, minHeight: 0 }}>
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0B0F1C', overflowY: 'auto' }}>
              {loadingJobs ? (
                <div style={{ padding: '0.75rem' }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'raPulse 1.4s ease infinite' }} />)}
                </div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>No jobs posted yet</p>
                  <button onClick={() => setTab('post')} style={{ fontSize: 13, color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Sora, sans-serif' }}>Post your first job →</button>
                </div>
              ) : (
                <div style={{ padding: '0.75rem' }}>
                  {jobs.map(job => {
                    const isSel = selectedJobId === job.id;
                    const st    = JOB_STATUS_STYLE[job.status];
                    return (
                      <button key={job.id} onClick={() => setJobId(job.id)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: `1px solid ${isSel ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`, background: isSel ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isSel ? '#C4B5FD' : 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{job.location} · {job.workMode}</p>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{job.status}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: (job._count?.applications ?? 0) > 0 ? '#60A5FA' : 'rgba(255,255,255,0.25)' }}>{job._count?.applications ?? 0} applicants</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(job.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', overflowY: 'auto' }}>
              {!selectedJob ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.2)', flexDirection: 'column', gap: 8 }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.4"><rect x="5" y="5" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="15" x2="28" y2="15" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="25" x2="20" y2="25" stroke="currentColor" strokeWidth="1.5"/></svg>
                  <p style={{ fontSize: 14, margin: 0 }}>Select a job to view applicants</p>
                </div>
              ) : (
                <div style={{ maxWidth: 740, animation: 'rdFade 0.3s ease' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em' }}>{selectedJob.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selectedJob.location} · {selectedJob.workMode} · {selectedJob.employmentType?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => toggleStatus(selectedJob.id, selectedJob.status)} style={{ flexShrink: 0, fontSize: 12, padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'Sora, sans-serif' }}>
                        {selectedJob.status === 'active' ? 'Close listing' : 'Reopen listing'}
                      </button>
                    </div>
                    {selectedJob.requiredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '1rem' }}>
                        {selectedJob.requiredSkills.map(s => <span key={s} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'rgba(167,139,250,0.1)', color: '#C4B5FD', border: '1px solid rgba(167,139,250,0.2)' }}>{s}</span>)}
                      </div>
                    )}
                    <p style={{ margin: '1rem 0 0', fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)' }}>{selectedJob.description.slice(0, 300)}{selectedJob.description.length > 300 && '…'}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>Applicants</p>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{applicants.length} total</span>
                  </div>

                  {loadingApps && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1,2].map(i => <div key={i} style={{ height: 64, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />)}
                    </div>
                  )}

                  {!loadingApps && applicants.length === 0 && (
                    <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>No applications yet</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applicants.map((app: Application) => {
                      const ast = STATUS_META[app.status] ?? STATUS_META.applied;
                      return (
                        <div key={app.id} style={{ padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {app.candidate?.name?.slice(0, 2).toUpperCase() ?? 'C'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{app.candidate?.name ?? 'Candidate'}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{app.candidate?.email} · Applied {fmtDate(app.applied_at)}</p>
                          </div>
                          <select value={app.status} onChange={e => updateStatus(app.id, e.target.value as ApplicationStatus)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, border: `1px solid ${ast.color}40`, background: ast.bg, color: ast.color, cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
                            {(Object.entries(STATUS_META) as [ApplicationStatus, (typeof STATUS_META)[ApplicationStatus]][]).map(([val, cfg]) => (
                              <option key={val} value={val}>{cfg.label}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post job tab */}
        {tab === 'post' && (
          <div style={{ padding: '2rem', maxWidth: 760, margin: '0 auto', width: '100%', animation: 'rdFade 0.3s ease' }}>
            <div style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#0D1220' }}>
              <p style={{ margin: '0 0 1.75rem', fontSize: 18, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Post a New Job</p>

              {formError && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}><p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{formError}</p></div>}
              {postSuccess && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 18 }}>🎉</span><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#34D399' }}>Job posted! Candidates will be notified.</p></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Job title *</label><input value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Senior Frontend Engineer" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Company name *</label><input value={form.company} onChange={e => f('company', e.target.value)} placeholder="e.g. Razorpay" style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Location *</label><input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Bangalore, India" style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Work mode</label>
                    <select value={form.work_mode} onChange={e => f('work_mode', e.target.value)} style={inputStyle}>
                      <option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Employment type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['full_time','contract','part_time','internship'] as const).map(val => {
                      const labels: Record<string,string> = { full_time:'Full-time', contract:'Contract', part_time:'Part-time', internship:'Internship' };
                      const sel = form.employment_type === val;
                      return (
                        <button key={val} type="button" onClick={() => f('employment_type', val)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: sel ? 700 : 400, border: `1px solid ${sel ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)'}`, background: sel ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)', color: sel ? '#A78BFA' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', transition: 'all 0.15s' }}>
                          {labels[val]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Salary min (₹)</label><input type="number" value={form.salary_min} onChange={e => f('salary_min', e.target.value)} placeholder="e.g. 1500000" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Salary max (₹)</label><input type="number" value={form.salary_max} onChange={e => f('salary_max', e.target.value)} placeholder="e.g. 2500000" style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>Job description *</label><textarea value={form.description} onChange={e => f('description', e.target.value)} rows={5} placeholder="Describe the role, responsibilities, and ideal candidate…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 } as React.CSSProperties} /></div>
                <div><label style={labelStyle}>Required skills *</label><SkillPicker selected={form.required_skills} onChange={skills => f('required_skills', skills)} /></div>
                <button onClick={handlePost} disabled={posting} style={{ width: '100%', padding: '13px', borderRadius: 12, background: posting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(109,40,217,0.9))', border: posting ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(124,58,237,0.5)', color: posting ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 14, fontWeight: 700, cursor: posting ? 'not-allowed' : 'pointer', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}>
                  {posting && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />}
                  {posting ? 'Posting…' : 'Post Job → Notify Candidates'}
                </button>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>Candidates matching your required skills will be notified automatically</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ← Profile + Settings drawer (opened by username card in Sidebar or ⚙ button above) */}
      <ProfilePanel />
    </>
  );
}
]]>
</file>
<file name="frontend\app\_components\shared\Sidebar.tsx">
<![CDATA[
'use client';

// ─────────────────────────────────────────────────────────────────────────────
// _components/shared/Sidebar.tsx
//
// Architecture:
//   - Settings REMOVED from nav entirely — lives inside ProfilePanel drawer
//   - Username card at bottom calls openPanel() from ProfilePanelContext
//     instead of navigating to /profile — no page transition, instant drawer
//   - Alerts live badge driven by useAlerts() — live unread count
//   - AnalysisState is type-only import to prevent runtime crash
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useResumeAnalysis } from '@/hooks/useAnalyseResume';
import type { AnalysisState } from '@/hooks/useAnalyseResume';
import ResumeAnalysisTab from '@/components/resumes/ResumeAnalysisTab';
import { useAlerts } from '@/hooks/useRealTimeAlerts';
import { useProfilePanel } from '@/components/context/ProfilePanelContext';

// ─────────────────────────────────────────────────────────────────────────────
// Nav definitions — Settings intentionally absent from both roles
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs', icon: '💼', label: 'Jobs' },
      { href: '/resumes', icon: '📄', label: 'Resume' },
      { href: '/resume-analysis', icon: '🧠', label: 'AI Analysis' },
      { href: '/interviews', icon: '🎥', label: 'Interviews' }, // NEW
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview', icon: '🎤', label: 'Mock Interview' },
    ],
  },
] as const;

const RECRUITER_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Overview' },
      { href: '/recruiter/dashboard', icon: '📊', label: 'Recruitment' },
      { href: '/recruiter/interviews', icon: '🎥', label: 'Interviews' }, // NEW
      { href: '/jobs', icon: '💼', label: 'All Jobs' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AI Analyse button states
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyseBtnCfg {
  label: string; sublabel: string; disabled: boolean;
  color: string; bg: string; border: string; icon: string;
}

const ANALYSE_CFG: Record<AnalysisState, AnalyseBtnCfg> = {
  idle: { label: 'No resume yet', sublabel: 'Upload a resume first', disabled: true, icon: '📄', color: 'rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
  uploaded: { label: 'Analyse Resume', sublabel: 'Run AI analysis on your CV', disabled: false, icon: '⚡', color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  triggering: { label: 'Starting…', sublabel: 'Queuing analysis job', disabled: true, icon: '⚡', color: '#A78BFA', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  processing: { label: 'Analysing…', sublabel: 'Gemini is reading your resume', disabled: true, icon: '⚡', color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)' },
  analyzed: { label: 'Analysis complete', sublabel: 'Resume fully analysed ✓', disabled: true, icon: '✓', color: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)' },
  failed: { label: 'Retry Analysis', sublabel: 'Previous attempt failed', disabled: false, icon: '↺', color: '#F87171', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: `2px solid ${color}33`, borderTopColor: color, animation: 'sbSpin 0.7s linear infinite', flexShrink: 0 }} />
  );
}

function ResumeAnalysisSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }}>
      <button onClick={() => setOpen(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🧠</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Resume Analysis</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Upload, analyse, get matched</div>
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      <div style={{ maxHeight: open ? 600 : 0, overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
        <div style={{ padding: '0 8px 12px' }}>
          <style>{`.sb-ap .text-gray-800,.sb-ap .text-gray-900{color:rgba(255,255,255,.85)!important}.sb-ap .text-gray-500,.sb-ap .text-gray-600{color:rgba(255,255,255,.4)!important}.sb-ap .border-gray-200{border-color:rgba(255,255,255,.08)!important}.sb-ap .bg-white,.sb-ap .bg-gray-50{background:rgba(255,255,255,.03)!important}.sb-ap .rounded-xl{border-radius:10px!important}`}</style>
          <div className="sb-ap"><ResumeAnalysisTab /></div>
        </div>
      </div>
    </div>
  );
}

function RecruiterStats() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('jc_recruiter_stats');
    if (!raw) return null;
    const s = JSON.parse(raw) as { activeJobs: number; newApplicants: number };
    if (!s.activeJobs && !s.newApplicants) return null;
    return (
      <div style={{ margin: '2px 10px 6px', padding: '8px 10px', borderRadius: 8, background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.18)', display: 'flex', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F472B6', lineHeight: 1 }}>{s.activeJobs}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>active</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', lineHeight: 1 }}>{s.newApplicants}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>applicants</div>
        </div>
      </div>
    );
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { openPanel } = useProfilePanel();

  const { analysisState = 'idle', canAnalyse = false, trigger, error } = useResumeAnalysis();
  const { unreadCount = 0 } = useAlerts();

  const isCandidate = user?.role === 'candidate';
  const isRecruiter = user?.role === 'recruiter';
  const navGroups = isCandidate ? CANDIDATE_NAV : RECRUITER_NAV;
  const cfg = ANALYSE_CFG[analysisState] ?? ANALYSE_CFG.idle;
  const isSpinning = analysisState === 'triggering' || analysisState === 'processing';
  const initial = user?.full_name?.charAt(0).toUpperCase()
    ?? user?.email?.charAt(0).toUpperCase()
    ?? 'U';

  return (
    <>
      <style>{`
        @keyframes sbSpin  { to { transform: rotate(360deg); } }
        @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .sb-root {
          width: 240px; height: 100vh; position: sticky; top: 0;
          background: #0D1117; border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; flex-shrink: 0;
          font-family: 'Sora', sans-serif;
        }
        .sb-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .sb-logo-mark { font-size: 18px; font-weight: 800; color: #38BDF8; }
        .sb-logo-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }

        .sb-nav { flex: 1; padding: .5rem .75rem 0; overflow-y: auto; min-height: 0; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 2px; }

        .sb-grp { font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.2); padding: 0 .5rem; margin: .6rem 0 .3rem; }

        .sb-link {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px; margin-bottom: 2px;
          font-size: 13px; font-weight: 500; text-decoration: none;
          color: rgba(255,255,255,.45); border: 1px solid transparent;
          transition: all .15s; position: relative;
        }
        .sb-link:hover { background: rgba(255,255,255,.05); color: rgba(255,255,255,.8); }
        .sb-link.ac { background: rgba(56,189,248,.08);  color: #38BDF8; border-color: rgba(56,189,248,.15); }
        .sb-link.ar { background: rgba(244,114,182,.08); color: #F472B6; border-color: rgba(244,114,182,.15); }
        .sb-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

        .sb-badge {
          margin-left: auto; min-width: 18px; height: 18px; padding: 0 5px;
          border-radius: 9px; background: rgba(167,139,250,.2); color: #A78BFA;
          font-size: 10px; font-weight: 700; display: flex; align-items: center;
          justify-content: center; border: 1px solid rgba(167,139,250,.3);
        }

        .sb-ai { padding: .75rem; border-top: 1px solid rgba(255,255,255,.05); flex-shrink: 0; }
        .sb-ai-btn {
          width: 100%; padding: 10px 12px; border-radius: 10px;
          font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all .15s; display: flex; align-items: center;
          gap: 10px; text-align: left; border: 1px solid;
        }
        .sb-ai-btn:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .sb-ai-btn:disabled { cursor: default; }
        .sb-ai-lbl { display: block; line-height: 1.3; }
        .sb-ai-sub { display: block; font-size: 10px; font-weight: 400; opacity: .6; margin-top: 1px; }
        .sb-ai-err { font-size: 11px; color: #FCA5A5; padding: 4px 2px 0; line-height: 1.4; }

        .sb-rec-cta {
          margin: .5rem .75rem .25rem; padding: 10px; border-radius: 10px;
          text-decoration: none; background: rgba(244,114,182,.08);
          border: 1px solid rgba(244,114,182,.2); color: #F472B6;
          font-size: 12px; font-weight: 600; display: flex; align-items: center;
          justify-content: center; gap: 6px; transition: all .15s; flex-shrink: 0;
        }
        .sb-rec-cta:hover { background: rgba(244,114,182,.14); }

        .sb-foot { padding: .75rem; border-top: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }
        .sb-ucard {
          display: flex; align-items: center; gap: 10px;
          padding: 10px; border-radius: 10px; cursor: pointer;
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
          transition: all .15s; width: 100%; text-align: left;
          font-family: 'Sora', sans-serif;
        }
        .sb-ucard:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.13); }
        .sb-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#6366F1,#8B5CF6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
        }
        .sb-uinfo { flex: 1; min-width: 0; }
        .sb-uname { font-size: 12px; font-weight: 600; color: rgba(255,255,255,.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-urole { font-size: 10px; color: rgba(255,255,255,.3); text-transform: capitalize; margin-top: 1px; }
        .sb-uhint { font-size: 9px; color: rgba(255,255,255,.18); margin-top: 2px; }
        .sb-logout {
          background: none; border: none; cursor: pointer; flex-shrink: 0;
          color: rgba(255,255,255,.22); font-size: 14px; padding: 4px;
          border-radius: 4px; transition: color .15s; line-height: 1;
        }
        .sb-logout:hover { color: #F87171; }
      `}</style>

      <aside className="sb-root" aria-label="Sidebar navigation">
        <div className="sb-logo">
          <span className="sb-logo-mark">⬡</span>
          <span className="sb-logo-name">JobCrawler</span>
        </div>

        <nav className="sb-nav">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              <div className="sb-grp">{group.label}</div>

              {group.items.map(item => {
                const active = pathname === item.href
                  || (item.href !== '/dashboard' && item.href !== '/recruiter/dashboard' && pathname.startsWith(item.href));
                const cls = active ? (isRecruiter ? 'ar' : 'ac') : '';

                return (
                  <Link key={item.href} href={item.href} className={`sb-link ${cls}`}>
                    <span className="sb-icon">{item.icon}</span>
                    {item.label}
                    {item.href === '/alerts' && unreadCount > 0 && (
                      <span className="sb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </Link>
                );
              })}

              {isRecruiter && gi === 0 && <RecruiterStats />}
              {isCandidate && gi === 0 && <ResumeAnalysisSection />}
            </div>
          ))}
        </nav>

        {isCandidate && (
          <div className="sb-ai">
            <div className="sb-grp" style={{ marginBottom: 8 }}>AI Tools</div>
            <button className="sb-ai-btn"
              onClick={canAnalyse ? () => { void trigger(); } : undefined}
              disabled={cfg.disabled}
              style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {isSpinning ? <Spinner color={cfg.color} /> : cfg.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="sb-ai-lbl">{cfg.label}</span>
                <span className="sb-ai-sub">{cfg.sublabel}</span>
              </div>
              {analysisState === 'processing' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', flexShrink: 0, animation: 'sbPulse 1.5s ease infinite' }} />
              )}
            </button>
            {error && analysisState === 'failed' && <p className="sb-ai-err">{error}</p>}
            <Link href="/resume-analysis" style={{ display: 'block', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.22)', textDecoration: 'none', marginTop: 8 }}>
              View full analysis →
            </Link>
          </div>
        )}

        {isRecruiter && (
          <Link href="/recruiter/dashboard" className="sb-rec-cta">
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Post a New Job
          </Link>
        )}

        {user && (
          <div className="sb-foot">
            <div
              className="sb-ucard"
              onClick={openPanel}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openPanel();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Open profile and settings"
              title="Profile & Settings"
            >
              <div className="sb-avatar" aria-hidden="true">{initial}</div>
              <div className="sb-uinfo">
                <div className="sb-uname">{user.full_name ?? user.email}</div>
                <div className="sb-urole">{user.role}</div>
                <div className="sb-uhint">Profile &amp; Settings →</div>
              </div>

              <button
                type="button"
                className="sb-logout"
                onClick={(e) => { e.stopPropagation(); logout(); }}
                aria-label="Log out"
                title="Log out"
              >
                ⏻
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;
]]>
</file>
<file name="frontend\app\(protected)\interviews\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { interviewApi } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: string;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED') return '#F87171';
  if (stage === 'HIRED') return '#10B981';
  if (stage === 'SHORTLISTED') return '#38BDF8';
  if (stage.includes('INTERVIEW')) return '#A78BFA';
  return 'rgba(255,255,255,0.75)';
};

export default function CandidateInterviewsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selected) ?? null,
    [items, selected],
  );

  // Load interview list + poll every 30s
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await interviewApi.listCandidateInterviews({ limit: 30 });

        if (!alive) return;
        const data = (res.data ?? []) as InterviewItem[];
        setItems(data);

        // Keep current selection if still present, else fallback to first item
        setSelected((prev) => {
          if (prev && data.some((x) => x.id === prev)) return prev;
          return data[0]?.id ?? null;
        });

        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message ?? 'Failed to load interviews');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    const iv = setInterval(load, 30_000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Load selected interview rounds
  useEffect(() => {
    let alive = true;

    const loadDetail = async () => {
      if (!selected) {
        setRounds([]);
        return;
      }

      try {
        const res = await interviewApi.getCandidateInterview(selected);
        if (!alive) return;
        setRounds((res.data?.rounds ?? []) as RoundItem[]);
      } catch {
        if (!alive) return;
        setRounds([]);
      }
    };

    void loadDetail();
    return () => {
      alive = false;
    };
  }, [selected]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
      )[0];
  }, [rounds]);

  const openInternalRoom = (round: RoundItem) => {
    if (!selectedInterview) return;
    const roomId = `jc-${selectedInterview.id}-r${round.round_number}`;
    router.push(`/interviews/room/${roomId}`);
  };

  return (
    <main style={{ padding: 20, color: 'white' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>My Interviews</h1>
      <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
        Track your real interview process, rounds, reminders, and join links.
      </p>

      {error && (
        <div style={{ marginBottom: 12, color: '#FCA5A5' }}>{error}</div>
      )}

      {nextRound && (
        <section
          style={{
            marginBottom: 16,
            padding: 14,
            border: '1px solid rgba(56,189,248,.25)',
            borderRadius: 10,
            background: 'rgba(56,189,248,.08)',
          }}
        >
          <div style={{ fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>
            Upcoming Round
          </div>
          <div style={{ marginTop: 4, fontSize: 15 }}>
            {nextRound.round_type.toUpperCase()} ·{' '}
            {nextRound.scheduled_at
              ? new Date(nextRound.scheduled_at).toLocaleString()
              : 'TBD'}
          </div>

          <button
            onClick={() => openInternalRoom(nextRound)}
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#38BDF8',
              color: '#001018',
              textDecoration: 'none',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Join Interview
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section
          style={{
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,.08)',
              fontWeight: 600,
            }}
          >
            Applications in Process
          </div>

          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
                No interviews yet.
              </div>
            ) : (
              items.map((it) => {
                const active = selected === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,.06)',
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {it.job_title ?? 'Job'}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                      {it.company ?? '-'}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: stageColor(it.current_stage),
                        fontWeight: 700,
                      }}
                    >
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section
          style={{
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,.08)',
              fontWeight: 600,
            }}
          >
            {selectedInterview
              ? `${selectedInterview.job_title ?? 'Interview'} Timeline`
              : 'Interview Details'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: 'rgba(255,255,255,.6)' }}>
              Select an interview.
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
                  Current Stage:{' '}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: stageColor(selectedInterview.current_stage),
                  }}
                >
                  {selectedInterview.current_stage}
                </span>
              </div>

              <h3 style={{ margin: '10px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>
                  No rounds scheduled yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                          {r.result ?? 'pending'}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'rgba(255,255,255,.7)',
                        }}
                      >
                        {r.scheduled_at
                          ? new Date(r.scheduled_at).toLocaleString()
                          : 'Not scheduled'}
                      </div>

                      <button
                        onClick={() => openInternalRoom(r)}
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          fontSize: 12,
                          color: '#38BDF8',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        Join Room
                      </button>

                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#A78BFA' }}>
                          Score: {r.score}
                        </div>
                      )}
                      {r.feedback && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: 'rgba(255,255,255,.75)',
                          }}
                        >
                          {r.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
]]>
</file>
<file name="frontend\app\(protected)\interviews\room\[room-id]\page.tsx">
<![CDATA[
'use client';

/**
 * /interviews/room/[room-id]/page.tsx
 *
 * Production-grade video conferencing room — Google Meet quality.
 *
 * Features:
 *   ✅ Pre-join lobby with camera/mic preview and device selection
 *   ✅ Adaptive video grid (1–6 tiles, responsive layout)
 *   ✅ Pinned/spotlight view for active speaker
 *   ✅ Voice activity detection (speaking ring animation)
 *   ✅ Mic / Camera / Screen share controls
 *   ✅ In-room text chat with unread badge
 *   ✅ Participants panel with live media state
 *   ✅ Connection state machine with error recovery
 *   ✅ Timer + live indicator
 *   ✅ Fully typed throughout
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { interviewApi } from '@/lib/axios';
import {
  useWebRTCRoom,
  type RemotePeer,
  type ChatMessage,
} from '@/hooks/useWebRTCRoom';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  bg:      '#050810',
  panel:   '#0B0E1A',
  surface: '#111827',
  glass:   'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.08)',
  muted:   'rgba(255,255,255,0.45)',
  faint:   'rgba(255,255,255,0.18)',
  white:   '#F8FAFC',

  green:   '#10B981',
  red:     '#EF4444',
  blue:    '#38BDF8',
  indigo:  '#6366F1',
  purple:  '#8B5CF6',
  amber:   '#F59E0B',
  rose:    '#F43F5E',
} as const;

// ─── useSpeakingDetector ──────────────────────────────────────────────────────
// AudioContext VAD — returns true when avg frequency power exceeds threshold.

function useSpeakingDetector(stream: MediaStream | null, threshold = 20): boolean {
  const [speaking, setSpeaking] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) { setSpeaking(false); return; }
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    let ctx: AudioContext;
    let destroyed = false;

    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return; }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    const src = ctx.createMediaStreamSource(stream);
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (destroyed) return;
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(avg > threshold);
      rafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume().then(tick);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      void ctx.close().catch(() => {});
    };
  }, [stream, threshold]);

  return speaking;
}

// ─── useCallTimer ─────────────────────────────────────────────────────────────

function useCallTimer(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) { setSecs(0); return; }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// ─── useDevices ───────────────────────────────────────────────────────────────

function useDevices() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput'));
      setMics(devices.filter(d => d.kind === 'audioinput'));
      setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
    } catch { /* permissions not yet granted */ }
  }, []);

  useEffect(() => {
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [refresh]);

  return { cameras, microphones, speakers, refresh };
}

// ─── VideoTrack ───────────────────────────────────────────────────────────────
// Pure component that attaches a MediaStream to a <video> element.

function VideoTrack({
  stream,
  muted = false,
  contain = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  contain?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: contain ? 'contain' : 'cover',
        background: '#000',
        display: stream ? 'block' : 'none',
      }}
    />
  );
}

// ─── ParticipantTile ──────────────────────────────────────────────────────────

type TileProps = {
  stream: MediaStream | null;
  name: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  isSpotlight?: boolean;
  onClick?: () => void;
};

function ParticipantTile({
  stream, name, role, micOn, camOn, screenSharing,
  isLocal, isSpeaking, isPinned, isSpotlight, onClick,
}: TileProps) {
  const remoteSpeaking = useSpeakingDetector(isLocal ? null : stream);
  const activeSpeaking = isLocal ? (isSpeaking ?? false) : remoteSpeaking;
  const initial = (name || '?').charAt(0).toUpperCase();

  const roleLabel = role === 'recruiter' ? 'Interviewer' : role === 'candidate' ? 'Candidate' : '';
  const roleColor = role === 'recruiter' ? T.blue : T.purple;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: isSpotlight ? 12 : 10,
        overflow: 'hidden',
        background: T.surface,
        cursor: onClick ? 'pointer' : 'default',
        border: activeSpeaking
          ? `2px solid ${T.green}`
          : isPinned
          ? `2px solid ${T.indigo}`
          : `1px solid ${T.border}`,
        boxShadow: activeSpeaking
          ? `0 0 0 3px ${T.green}30, 0 8px 40px rgba(0,0,0,0.6)`
          : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        aspectRatio: '16/9',
        userSelect: 'none',
      }}
    >
      {/* Avatar fallback */}
      {(!camOn || !stream) && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(145deg, #0F1629 0%, #1A1F3A 100%)`,
          gap: 8,
        }}>
          <div style={{
            width: isSpotlight ? 80 : 52,
            height: isSpotlight ? 80 : 52,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple} 0%, ${T.indigo} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isSpotlight ? 30 : 20,
            fontWeight: 700,
            color: '#fff',
            boxShadow: `0 4px 20px ${T.purple}50`,
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <span style={{ fontSize: 12, color: T.muted, maxWidth: 120, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {!micOn && (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40`,
            }}>
              Muted
            </span>
          )}
        </div>
      )}

      {/* Video */}
      <VideoTrack
        stream={stream}
        muted={isLocal}
        contain={screenSharing}
      />

      {/* Speaking ring */}
      {activeSpeaking && (
        <div style={{
          position: 'absolute', inset: -2,
          borderRadius: 'inherit',
          border: `3px solid ${T.green}`,
          animation: 'speakRing 1s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Screen share badge */}
      {screenSharing && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 8px', borderRadius: 20,
          background: T.blue, color: '#001521',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
        }}>
          SCREEN
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 10px 8px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {isLocal ? 'You' : name}
          </span>
          {roleLabel && (
            <span style={{ fontSize: 10, color: roleColor, fontWeight: 500, flexShrink: 0 }}>
              {roleLabel}
            </span>
          )}
        </div>
        {!micOn && (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${T.red}CC`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, flexShrink: 0,
          }}>
            🔇
          </div>
        )}
      </div>

      {/* Pinned badge */}
      {isPinned && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 22, height: 22, borderRadius: '50%',
          background: T.indigo,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11,
        }}>
          📌
        </div>
      )}
    </div>
  );
}

// ─── VideoGrid ────────────────────────────────────────────────────────────────

type GridParticipant = {
  userId: string;
  stream: MediaStream | null;
  name: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
};

function VideoGrid({
  participants,
  pinnedUserId,
  onPin,
}: {
  participants: GridParticipant[];
  pinnedUserId: string | null;
  onPin: (userId: string) => void;
}) {
  const n = participants.length;

  // Pinned/spotlight layout: pinned tile large, others strip on right
  const pinnedParticipant = pinnedUserId
    ? participants.find(p => p.userId === pinnedUserId)
    : null;
  const others = pinnedParticipant
    ? participants.filter(p => p.userId !== pinnedUserId)
    : [];

  if (pinnedParticipant && n > 1) {
    return (
      <div style={{ display: 'flex', flex: 1, gap: 8, height: '100%' }}>
        {/* Spotlight */}
        <div style={{ flex: 1 }}>
          <ParticipantTile
            {...pinnedParticipant}
            isPinned
            isSpotlight
            onClick={() => onPin(pinnedParticipant.userId)}
          />
        </div>
        {/* Strip */}
        <div style={{
          width: 200, display: 'flex', flexDirection: 'column', gap: 8,
          overflowY: 'auto',
        }}>
          {others.map(p => (
            <ParticipantTile
              key={p.userId}
              {...p}
              onClick={() => onPin(p.userId)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Dynamic grid
  const cols = n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 3;
  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 8,
      alignContent: 'start',
      alignItems: 'stretch',
    }}>
      {participants.map(p => (
        <ParticipantTile
          key={p.userId}
          {...p}
          onClick={() => onPin(p.userId)}
        />
      ))}
    </div>
  );
}

// ─── CtrlButton ───────────────────────────────────────────────────────────────

function CtrlButton({
  icon, label, active, danger, badge, onClick, disabled,
}: {
  icon: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const bg = danger
    ? T.red
    : active === false
    ? `${T.red}25`
    : T.glass;
  const color = danger ? '#fff' : active === false ? T.red : T.white;
  const border = danger ? 'none' : active === false ? `1px solid ${T.red}50` : `1px solid ${T.border}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
        minWidth: danger ? 'auto' : 56,
        height: danger ? 44 : 58,
        padding: danger ? '0 24px' : '0 6px',
        borderRadius: danger ? 999 : 14,
        background: bg, color, border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, transform 0.1s',
        fontFamily: 'inherit',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 10, color: danger ? 'rgba(255,255,255,0.8)' : T.muted, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {(badge ?? 0) > 0 && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          minWidth: 16, height: 16, borderRadius: 8,
          background: T.purple, color: '#fff',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
        }}>
          {(badge ?? 0) > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

function ChatPanel({
  messages, myUserId, onSend, onClose,
}: {
  messages: ChatMessage[];
  myUserId: string;
  onSend: (m: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: T.panel,
      borderLeft: `1px solid ${T.border}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.white }}>
          Chat
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 20, lineHeight: 1, padding: '0 2px',
        }}>
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: T.faint, textAlign: 'center',
          }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span style={{ fontSize: 13 }}>No messages yet</span>
          </div>
        ) : messages.map((m, i) => {
          const isMe = m.userId === myUserId;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: isMe ? T.purple : T.blue,
                }}>
                  {isMe ? 'You' : m.name}
                </span>
                <span style={{ fontSize: 10, color: T.faint }}>{fmt(m.timestamp)}</span>
              </div>
              <div style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                background: isMe ? `${T.purple}20` : T.glass,
                border: `1px solid ${isMe ? T.purple + '40' : T.border}`,
                fontSize: 13, color: T.white, lineHeight: 1.55,
                wordBreak: 'break-word',
              }}>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 8,
        flexShrink: 0,
      }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Message…"
          style={{
            flex: 1, padding: '9px 12px',
            background: T.glass, border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.white, fontSize: 13,
            fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: draft.trim() ? T.purple : T.glass,
            color: draft.trim() ? '#fff' : T.faint,
            fontSize: 16, cursor: draft.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── ParticipantsPanel ────────────────────────────────────────────────────────

function ParticipantsPanel({
  localUser,
  localMicOn,
  localCamOn,
  peers,
  onClose,
}: {
  localUser: { name: string; role?: string };
  localMicOn: boolean;
  localCamOn: boolean;
  peers: RemotePeer[];
  onClose: () => void;
}) {
  const all = [
    { userId: 'local', name: localUser.name, role: localUser.role, micOn: localMicOn, camOn: localCamOn, isLocal: true },
    ...peers.map(p => ({ ...p, isLocal: false })),
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: T.panel,
      borderLeft: `1px solid ${T.border}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.white }}>
          People ({all.length})
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 20, lineHeight: 1, padding: '0 2px',
        }}>×</button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {all.map(p => (
          <div key={p.userId} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: T.glass, border: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {(p.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>
                {p.name} {p.isLocal && (
                  <span style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>(You)</span>
                )}
              </div>
              {p.role && (
                <div style={{
                  fontSize: 11,
                  color: p.role === 'recruiter' ? T.blue : T.purple,
                }}>
                  {p.role === 'recruiter' ? 'Interviewer' : 'Candidate'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <span style={{ fontSize: 14, opacity: p.micOn ? 1 : 0.25 }}>
                {p.micOn ? '🎙️' : '🔇'}
              </span>
              <span style={{ fontSize: 14, opacity: p.camOn ? 1 : 0.25 }}>
                {p.camOn ? '📹' : '📷'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ConnectionOverlay ────────────────────────────────────────────────────────

function ConnectionOverlay({
  state,
  error,
  onRetry,
}: {
  state: string;
  error: string;
  onRetry: () => void;
}) {
  const isError = state === 'error';
  const isLeft = state === 'left';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,8,16,0.92)',
      backdropFilter: 'blur(8px)',
      gap: 16, zIndex: 50,
    }}>
      {isError ? (
        <>
          <div style={{ fontSize: 40 }}>❌</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>
            Connection Failed
          </div>
          {error && (
            <div style={{
              fontSize: 13, color: '#FCA5A5', maxWidth: 360, textAlign: 'center',
              padding: '10px 14px', borderRadius: 10,
              background: `${T.red}15`, border: `1px solid ${T.red}30`,
            }}>
              {error}
            </div>
          )}
          <button
            onClick={onRetry}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: T.indigo, color: '#fff', fontWeight: 700,
              fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Retry Connection
          </button>
        </>
      ) : isLeft ? (
        <>
          <div style={{ fontSize: 40 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>
            You left the call
          </div>
        </>
      ) : (
        <>
          <div style={{ position: 'relative', width: 48, height: 48 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `3px solid ${T.border}`,
              borderTopColor: T.indigo,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
          <div style={{ fontSize: 14, color: T.muted }}>
            {state === 'acquiring-media' && 'Setting up camera & microphone…'}
            {state === 'connecting-socket' && 'Connecting to server…'}
            {state === 'joining-room' && 'Joining room…'}
            {state === 'reconnecting' && 'Reconnecting…'}
            {state === 'idle' && 'Initializing…'}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PreJoinLobby ─────────────────────────────────────────────────────────────

function PreJoinLobby({
  roomId,
  userName,
  onJoin,
}: {
  roomId: string;
  userName: string;
  onJoin: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [checking, setChecking] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [permError, setPermError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const { cameras, microphones } = useDevices();
  const [camId, setCamId] = useState('');
  const [micId, setMicId] = useState('');
  const rafRef = useRef<number>(0);

  const startPreview = useCallback(async (camDeviceId?: string, micDeviceId?: string) => {
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    setPermError('');
    setChecking(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camDeviceId ? { deviceId: { exact: camDeviceId } } : true,
        audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
      });
      previewStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Audio level meter
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(Math.min(100, avg * 2.5));
        rafRef.current = requestAnimationFrame(tick);
      };
      void ctx.resume().then(tick);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setPermError('Camera/microphone access was denied. Please allow permissions in your browser settings and reload.');
      } else {
        setPermError(`Could not access your camera or microphone: ${e.message}`);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void startPreview();
    return () => {
      cancelAnimationFrame(rafRef.current);
      previewStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startPreview]);

  const toggleMic = () => {
    const next = !micOn;
    previewStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    previewStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = next));
    setCamOn(next);
  };

  const handleJoin = () => {
    cancelAnimationFrame(rafRef.current);
    previewStreamRef.current?.getTracks().forEach(t => t.stop());
    previewStreamRef.current = null;
    onJoin();
  };

  const initial = userName.charAt(0).toUpperCase();

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
      color: T.white,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select { background: ${T.surface} !important; color: ${T.white} !important; }
        select option { background: ${T.surface}; }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 640,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Branding */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            JobCrawler Interviews
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.white }}>
            Ready to join?
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: T.muted }}>
            Room: <code style={{ color: T.blue, background: `${T.blue}15`, padding: '2px 6px', borderRadius: 4 }}>
              {roomId}
            </code>
          </p>
        </div>

        {/* Preview */}
        <div style={{
          position: 'relative', borderRadius: 14, overflow: 'hidden',
          background: T.surface, aspectRatio: '16/9',
          border: `1px solid ${T.border}`,
        }}>
          {(!camOn || checking) && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(145deg, #0F1629, #1A1F3A)`,
              gap: 10,
            }}>
              {checking ? (
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: `3px solid ${T.border}`, borderTopColor: T.indigo,
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 700,
                  }}>
                    {initial}
                  </div>
                  <span style={{ fontSize: 13, color: T.muted }}>Camera is off</span>
                </>
              )}
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Quick controls overlay */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 10,
            zIndex: 3,
          }}>
            {[
              { icon: micOn ? '🎙️' : '🔇', label: micOn ? 'Mute' : 'Unmute', action: toggleMic, off: !micOn },
              { icon: camOn ? '📹' : '📷', label: camOn ? 'Stop camera' : 'Start camera', action: toggleCam, off: !camOn },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.label}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  border: 'none',
                  background: btn.off ? `${T.red}CC` : 'rgba(0,0,0,0.75)',
                  color: '#fff', fontSize: 20,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Mic level meter */}
        {!permError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>Mic level</span>
            <div style={{
              flex: 1, height: 6, borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${micOn ? audioLevel : 0}%`,
                background: audioLevel > 70 ? T.amber : T.green,
                transition: 'width 0.1s, background 0.3s',
              }} />
            </div>
            {!micOn && <span style={{ fontSize: 11, color: T.red, flexShrink: 0 }}>Muted</span>}
          </div>
        )}

        {/* Permission error */}
        {permError && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: `${T.red}15`, border: `1px solid ${T.red}40`,
            fontSize: 13, color: '#FCA5A5', lineHeight: 1.5,
          }}>
            {permError}
          </div>
        )}

        {/* Device selectors */}
        {!permError && (cameras.length > 1 || microphones.length > 1) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {cameras.length > 1 && (
              <div>
                <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5 }}>
                  Camera
                </label>
                <select
                  value={camId}
                  onChange={e => { setCamId(e.target.value); void startPreview(e.target.value, micId); }}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    border: `1px solid ${T.border}`, outline: 'none',
                  }}
                >
                  {cameras.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {microphones.length > 1 && (
              <div>
                <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 5 }}>
                  Microphone
                </label>
                <select
                  value={micId}
                  onChange={e => { setMicId(e.target.value); void startPreview(camId, e.target.value); }}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    border: `1px solid ${T.border}`, outline: 'none',
                  }}
                >
                  {microphones.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${d.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Identity card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 12,
          background: T.glass, border: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.purple}, ${T.indigo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {micOn ? '🎙️ Mic on' : '🔇 Muted'} · {camOn ? '📹 Camera on' : '📷 Camera off'}
            </div>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!!permError || checking}
          style={{
            padding: '14px', borderRadius: 12, border: 'none',
            background: permError || checking
              ? T.glass
              : `linear-gradient(135deg, ${T.green} 0%, #059669 100%)`,
            color: permError || checking ? T.muted : '#052E16',
            fontSize: 15, fontWeight: 800,
            cursor: permError || checking ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            boxShadow: permError || checking ? 'none' : `0 4px 20px ${T.green}40`,
            transition: 'all 0.2s',
          }}
        >
          {checking ? 'Setting up…' : 'Join Interview →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: T.faint, margin: 0 }}>
          💡 Use headphones to prevent echo
        </p>
      </div>
    </div>
  );
}

// ─── MeetingRoom ──────────────────────────────────────────────────────────────

type SidePanel = 'chat' | 'participants' | null;

function MeetingRoom({ roomId, user }: {
  roomId: string;
  user: { id: string; full_name?: string; role?: string };
}) {
  const router = useRouter();
  const {
    connectionState, connected, connecting, localStream,
    peers, messages, micOn, camOn, screenSharing, error,
    hostPresent, roomEnded, canEndRoom,
    join, leave, toggleMic, toggleCam,
    startScreenShare, stopScreenShare, sendMessage, endRoom,
  } = useWebRTCRoom({ roomId, user });

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const lastMsgCount = useRef(0);
  const elapsed = useCallTimer(connected);
  const localSpeaking = useSpeakingDetector(localStream);

  // Track unread chat
  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      if (sidePanel !== 'chat') {
        setChatUnread(n => n + (messages.length - lastMsgCount.current));
      }
    }
    lastMsgCount.current = messages.length;
  }, [messages.length, sidePanel]);

  const openChat = () => {
    setSidePanel(p => p === 'chat' ? null : 'chat');
    setChatUnread(0);
  };

  const openPeople = () => setSidePanel(p => p === 'participants' ? null : 'participants');

  // Auto-join on mount
  useEffect(() => { void join(); }, [join]);

  const handleLeave = useCallback(() => {
    leave();
    router.push(user.role === 'recruiter' ? '/recruiter/interviews' : '/interviews');
  }, [leave, router, user.role]);

  const handlePin = (userId: string) => {
    setPinnedUserId(prev => prev === userId ? null : userId);
  };

  // Assemble grid participants
  const gridParticipants = useMemo<GridParticipant[]>(() => {
    const local: GridParticipant = {
      userId: 'local',
      stream: localStream,
      name: user.full_name ?? 'You',
      role: user.role,
      micOn,
      camOn,
      screenSharing,
      isLocal: true,
      isSpeaking: localSpeaking,
    };
    const remotes: GridParticipant[] = peers.map(p => ({
      userId: p.userId,
      stream: p.stream,
      name: p.name ?? 'Participant',
      role: p.role,
      micOn: p.micOn,
      camOn: p.camOn,
      screenSharing: p.screenSharing,
    }));
    return [local, ...remotes];
  }, [localStream, user, micOn, camOn, screenSharing, localSpeaking, peers]);

  const showOverlay = !connected || connectionState === 'error' || connectionState === 'left';
  const waitingForInterviewer = connected && user.role === 'candidate' && !hostPresent && !roomEnded;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', overflow: 'hidden',
      background: T.bg,
      fontFamily: "'Inter', 'Sora', system-ui, sans-serif",
      color: T.white,
    }}>
      <style>{`
        @keyframes speakRing {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${T.green}60; }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px ${T.green}00; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder { color: ${T.faint}; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px',
        background: T.panel,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        height: 54,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.blue }}>⬡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>
              Interview Room
            </div>
            <div style={{ fontSize: 10, color: T.faint, fontFamily: 'monospace' }}>
              {roomId}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {connected && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20,
              background: `${T.green}15`, border: `1px solid ${T.green}35`,
              fontSize: 12, fontWeight: 700, color: T.green,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: T.green, display: 'inline-block',
                animation: 'blink 1.8s ease infinite',
              }} />
              {elapsed}
            </div>
          )}

          {connecting && (
            <div style={{ fontSize: 12, color: T.amber }}>Connecting…</div>
          )}

          <div style={{
            fontSize: 12, color: T.muted,
            padding: '4px 10px', borderRadius: 20,
            background: T.glass, border: `1px solid ${T.border}`,
          }}>
            {gridParticipants.length} {gridParticipants.length === 1 ? 'person' : 'people'}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>

        {/* Connection overlay */}
        {showOverlay && (
          <ConnectionOverlay
            state={connectionState}
            error={error}
            onRetry={() => { void join(); }}
          />
        )}

        {/* Video area */}
        <div style={{
          flex: 1, padding: 10, display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {waitingForInterviewer && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              padding: '8px 14px',
              borderRadius: 999,
              background: `${T.amber}20`,
              border: `1px solid ${T.amber}55`,
              color: '#FCD34D',
              fontSize: 12,
              fontWeight: 700,
            }}>
              Waiting for interviewer to join...
            </div>
          )}

          {roomEnded && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 25,
              padding: '8px 14px',
              borderRadius: 999,
              background: `${T.red}20`,
              border: `1px solid ${T.red}55`,
              color: '#FCA5A5',
              fontSize: 12,
              fontWeight: 700,
            }}>
              Interview ended by host
            </div>
          )}

          <VideoGrid
            participants={gridParticipants}
            pinnedUserId={pinnedUserId}
            onPin={handlePin}
          />
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {sidePanel === 'chat' && (
              <ChatPanel
                messages={messages}
                myUserId={user.id}
                onSend={sendMessage}
                onClose={() => setSidePanel(null)}
              />
            )}
            {sidePanel === 'participants' && (
              <ParticipantsPanel
                localUser={{ name: user.full_name ?? 'You', role: user.role }}
                localMicOn={micOn}
                localCamOn={camOn}
                peers={peers}
                onClose={() => setSidePanel(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <footer style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '10px 20px',
        background: T.panel,
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
        height: 78,
      }}>
        <CtrlButton
          icon={micOn ? '🎙️' : '🔇'}
          label={micOn ? 'Mute' : 'Unmute'}
          active={micOn}
          onClick={toggleMic}
        />
        <CtrlButton
          icon={camOn ? '📹' : '📷'}
          label={camOn ? 'Stop video' : 'Start video'}
          active={camOn}
          onClick={toggleCam}
          disabled={screenSharing}
        />
        <CtrlButton
          icon="🖥️"
          label={screenSharing ? 'Stop share' : 'Share screen'}
          active={!screenSharing}
          onClick={screenSharing ? () => { void stopScreenShare(); } : () => { void startScreenShare(); }}
        />

        <div style={{ width: 1, height: 32, background: T.border, margin: '0 4px' }} />

        <CtrlButton
          icon="💬"
          label="Chat"
          active={sidePanel === 'chat'}
          badge={sidePanel !== 'chat' ? chatUnread : 0}
          onClick={openChat}
        />
        <CtrlButton
          icon="👥"
          label="People"
          active={sidePanel === 'participants'}
          onClick={openPeople}
        />

        <div style={{ width: 1, height: 32, background: T.border, margin: '0 4px' }} />

        <CtrlButton
          icon="✕"
          label="Leave"
          danger
          onClick={handleLeave}
        />

        {canEndRoom && (
          <CtrlButton
            icon="⏹"
            label="End Interview"
            danger
            onClick={() => {
              endRoom();
              leave();
              router.push('/recruiter/interviews');
            }}
          />
        )}
      </footer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  const params = useParams();
  const roomId =
    (params?.['room-id'] as string) ??
    (params?.roomId as string) ??
    '';

  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    let mounted = true;
    const checkAccess = async () => {
      if (!user || !roomId) {
        if (mounted) setCheckingAccess(false);
        return;
      }

      try {
        setCheckingAccess(true);
        setAccessError('');
        await interviewApi.getRoomAccess(roomId);
      } catch (e: any) {
        const message =
          e?.response?.data?.message ??
          'You do not have access to this room or the room link has expired.';
        if (mounted) setAccessError(message);
      } finally {
        if (mounted) setCheckingAccess(false);
      }
    };

    void checkAccess();
    return () => {
      mounted = false;
    };
  }, [roomId, user]);

  if (!user) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: T.bg, color: T.muted,
        fontFamily: "system-ui, sans-serif", fontSize: 14,
        flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div>Please log in to join the interview.</div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: T.bg, color: T.muted,
        fontFamily: "system-ui, sans-serif", fontSize: 14,
      }}>
        Invalid room ID.
      </div>
    );
  }

  if (checkingAccess) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: T.bg, color: T.muted,
        fontFamily: 'system-ui, sans-serif', fontSize: 14,
      }}>
        Checking room access...
      </div>
    );
  }

  if (accessError) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: T.bg,
        color: T.white,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 32 }}>🔐</div>
        <div style={{ fontSize: 14, color: '#FCA5A5', maxWidth: 460, textAlign: 'center' }}>
          {accessError}
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <PreJoinLobby
        roomId={roomId}
        userName={user.full_name ?? user.email ?? 'You'}
        onJoin={() => setJoined(true)}
      />
    );
  }

  return <MeetingRoom roomId={roomId} user={user} />;
}
]]>
</file>
<file name="frontend\app\(protected)\recruiter\interviews\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { interviewApi } from '@/lib/axios';

type InterviewItem = {
  id: string;
  current_stage: string;
  status_code: number;
  final_status: string | null;
  updated_at: string;
  created_at: string;
  job_title?: string;
  company?: string;
  candidate_name?: string;
  candidate_email?: string;
};

type RoundItem = {
  id: string;
  round_number: number;
  round_type: 'hr' | 'technical' | 'managerial' | 'assignment';
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: 'video' | 'phone' | 'offline' | null;
  meeting_join_url: string | null;
  result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule' | null;
  score: number | null;
  feedback: string | null;
};

const S = {
  bg: '#07090F',
  card: '#0D1120',
  border: 'rgba(255,255,255,.08)',
  muted: 'rgba(255,255,255,.6)',
  blue: '#38BDF8',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#A78BFA',
  white: '#F8FAFC',
};

const stageColor = (stage: string) => {
  if (stage === 'REJECTED' || stage === 'INTERVIEW_FAILED') return S.red;
  if (stage === 'HIRED' || stage === 'INTERVIEW_PASSED') return S.green;
  if (stage === 'SHORTLISTED') return S.blue;
  if (stage.includes('INTERVIEW')) return S.purple;
  return 'rgba(255,255,255,0.75)';
};

const stages = [
  'APPLIED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_IN_PROGRESS',
  'INTERVIEW_PASSED',
  'INTERVIEW_FAILED',
  'FINAL_REVIEW',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'ON_HOLD',
  'WITHDRAWN',
] as const;

export default function RecruiterInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedBusy, setSchedBusy] = useState(false);
  const [roundType, setRoundType] = useState<'hr' | 'technical' | 'managerial' | 'assignment'>('technical');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [mode, setMode] = useState<'video' | 'phone' | 'offline'>('video');

  const [updatingStage, setUpdatingStage] = useState(false);

  const selectedInterview = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  );

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await interviewApi.listRecruiterInterviews({ limit: 50 });
      const data = (res.data ?? []) as InterviewItem[];
      setItems(data);
      setSelectedId((prev) => (prev && data.some((x) => x.id === prev) ? prev : data[0]?.id ?? null));
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load recruiter interviews');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      const res = await interviewApi.getRecruiterInterview(id);
      setRounds((res.data?.rounds ?? []) as RoundItem[]);
    } catch {
      setRounds([]);
    }
  };

  useEffect(() => {
    void loadList();
    const iv = setInterval(loadList, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRounds([]);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const nextRound = useMemo(() => {
    const now = Date.now();
    return rounds
      .filter((r) => r.scheduled_at && new Date(r.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [rounds]);

  const schedule = async () => {
    if (!selectedInterview) return;
    if (!scheduledAt) {
      alert('Please select date/time');
      return;
    }
    try {
      setSchedBusy(true);
      await interviewApi.scheduleRound(selectedInterview.id, {
        roundType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMins: Number(durationMins) || 45,
        mode,
      });
      setSchedOpen(false);
      await loadDetail(selectedInterview.id);
      await loadList();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to schedule round');
    } finally {
      setSchedBusy(false);
    }
  };

  const updateStage = async (stage: (typeof stages)[number]) => {
    if (!selectedInterview) return;
    try {
      setUpdatingStage(true);
      await interviewApi.updateStage(selectedInterview.id, stage);
      await loadList();
      await loadDetail(selectedInterview.id);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const submitRoundResult = async (roundId: string, result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule') => {
    try {
      await interviewApi.submitRoundResult(roundId, { result });
      if (selectedInterview) await loadDetail(selectedInterview.id);
      await loadList();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to update round result');
    }
  };

  const joinRoom = (round: RoundItem) => {
    if (!selectedInterview) return;
    const roomId = `jc-${selectedInterview.id}-r${round.round_number}`;
    window.location.href = `/interviews/room/${roomId}`;
  };

  return (
    <main style={{ padding: 20, color: S.white }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Recruiter Interviews</h1>
      <p style={{ color: S.muted, marginBottom: 16 }}>
        Schedule rounds, track outcomes, and join live interview rooms.
      </p>

      {error && <div style={{ color: '#FCA5A5', marginBottom: 12 }}>{error}</div>}

      {nextRound && selectedInterview && (
        <section style={{ marginBottom: 16, padding: 14, border: `1px solid ${S.blue}44`, borderRadius: 10, background: `${S.blue}14` }}>
          <div style={{ fontSize: 12, color: S.blue, fontWeight: 800 }}>Next Scheduled Round</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            {selectedInterview.candidate_name ?? 'Candidate'} · Round {nextRound.round_number} ({nextRound.round_type.toUpperCase()}) ·{' '}
            {nextRound.scheduled_at ? new Date(nextRound.scheduled_at).toLocaleString() : 'TBD'}
          </div>
          <button
            onClick={() => joinRoom(nextRound)}
            style={{ marginTop: 10, border: 'none', borderRadius: 8, padding: '8px 12px', background: S.blue, color: '#001018', fontWeight: 800, cursor: 'pointer' }}
          >
            Join Interview Room
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16 }}>
        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            Interviews
          </div>

          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 12, color: S.muted }}>Loading…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: 12, color: S.muted }}>No interviews found.</div>
            ) : (
              items.map((it) => {
                const active = selectedId === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelectedId(it.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: `1px solid rgba(255,255,255,.06)`,
                      padding: 12,
                      color: S.white,
                      background: active ? 'rgba(255,255,255,.06)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{it.job_title ?? 'Role'}</div>
                    <div style={{ fontSize: 12, color: S.muted }}>{it.company ?? '-'} · {it.candidate_name ?? 'Candidate'}</div>
                    <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: stageColor(it.current_stage) }}>
                      {it.current_stage}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section style={{ border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.border}`, fontWeight: 700 }}>
            {selectedInterview ? `Interview Details` : 'Select an interview'}
          </div>

          {!selectedInterview ? (
            <div style={{ padding: 12, color: S.muted }}>Select from the left panel.</div>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedInterview.job_title ?? 'Role'}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>
                    {selectedInterview.company ?? '-'} · {selectedInterview.candidate_name ?? '-'} {selectedInterview.candidate_email ? `(${selectedInterview.candidate_email})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    disabled={updatingStage}
                    defaultValue={selectedInterview.current_stage}
                    onChange={(e) => void updateStage(e.target.value as (typeof stages)[number])}
                    style={{
                      background: 'rgba(255,255,255,.05)',
                      border: `1px solid ${S.border}`,
                      color: S.white,
                      borderRadius: 8,
                      padding: '8px 10px',
                    }}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s} style={{ color: '#111' }}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSchedOpen((v) => !v)}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 12px',
                      background: S.green,
                      color: '#052E16',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {schedOpen ? 'Close Scheduler' : 'Schedule Round'}
                  </button>
                </div>
              </div>

              {schedOpen && (
                <div style={{ marginTop: 12, padding: 10, border: `1px solid ${S.border}`, borderRadius: 10, background: 'rgba(255,255,255,.03)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Schedule New Round</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                    <select value={roundType} onChange={(e) => setRoundType(e.target.value as any)} style={{ ...inputStyle }}>
                      <option value="hr">HR</option>
                      <option value="technical">Technical</option>
                      <option value="managerial">Managerial</option>
                      <option value="assignment">Assignment</option>
                    </select>

                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      style={inputStyle}
                    />

                    <input
                      type="number"
                      min={15}
                      step={5}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
                      style={inputStyle}
                    />

                    <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={inputStyle}>
                      <option value="video">Video</option>
                      <option value="phone">Phone</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => void schedule()}
                      disabled={schedBusy}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        background: S.blue,
                        color: '#001018',
                        fontWeight: 800,
                        cursor: schedBusy ? 'wait' : 'pointer',
                        opacity: schedBusy ? 0.7 : 1,
                      }}
                    >
                      {schedBusy ? 'Scheduling…' : 'Confirm Schedule'}
                    </button>
                  </div>
                </div>
              )}

              <h3 style={{ margin: '14px 0 8px', fontSize: 14 }}>Rounds</h3>
              {rounds.length === 0 ? (
                <div style={{ color: S.muted, fontSize: 13 }}>No rounds scheduled yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {rounds.map((r) => (
                    <div key={r.id} style={{ border: `1px solid ${S.border}`, borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          Round {r.round_number}: {r.round_type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: S.muted }}>{r.result ?? 'pending'}</div>
                      </div>

                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
                        {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : 'Not scheduled'} · {r.mode ?? '-'} · {r.duration_mins ?? '-'} mins
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => joinRoom(r)} style={linkBtn}>Join Room</button>
                        <button onClick={() => void submitRoundResult(r.id, 'pass')} style={miniBtn(S.green, '#052E16')}>Mark Pass</button>
                        <button onClick={() => void submitRoundResult(r.id, 'fail')} style={miniBtn(S.red, '#fff')}>Mark Fail</button>
                        <button onClick={() => void submitRoundResult(r.id, 'no_show')} style={miniBtn(S.amber, '#111827')}>No Show</button>
                      </div>

                      {typeof r.score === 'number' && (
                        <div style={{ marginTop: 8, fontSize: 12, color: S.purple }}>Score: {r.score}</div>
                      )}
                      {r.feedback && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{r.feedback}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
};

const linkBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: '#38BDF8',
  color: '#001018',
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
};

const miniBtn = (bg: string, color: string): React.CSSProperties => ({
  border: 'none',
  borderRadius: 7,
  padding: '6px 10px',
  background: bg,
  color,
  fontWeight: 800,
  fontSize: 12,
  cursor: 'pointer',
});
]]>
</file>
<file name="frontend\app\(protected)\recruiter\interviews\[interview-id]\live\page.tsx">
<![CDATA[
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { interviewApi, type InterviewStage } from '@/lib/axios';

type RoundItem = {
  id: string;
  round_number: number;
  round_type: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  mode: string | null;
  meeting_join_url: string | null;
  result: string | null;
  score: number | null;
  feedback: string | null;
};

type InterviewDetail = {
  interview: {
    id: string;
    current_stage: InterviewStage;
    status_code: number;
    final_status: string | null;
    candidate_id: string;
    recruiter_id: string;
    job_id: string;
  };
  rounds: RoundItem[];
  events: Array<{
    id: string;
    event_type: string;
    from_stage: string | null;
    to_stage: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>;
};

type ChecklistState = {
  joinedOnTime: boolean;
  introClarity: boolean;
  dsAlgo: boolean;
  systemDesign: boolean;
  debugging: boolean;
  communication: boolean;
  cultureFit: boolean;
  confidence: boolean;
};

const initialChecklist: ChecklistState = {
  joinedOnTime: false,
  introClarity: false,
  dsAlgo: false,
  systemDesign: false,
  debugging: false,
  communication: false,
  cultureFit: false,
  confidence: false,
};

const recommendationWeight: Record<string, number> = {
  'Strong Hire': 100,
  Hire: 80,
  'No Hire': 45,
  'Strong No Hire': 20,
};

export default function RecruiterInterviewLivePage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const interviewId = params?.interviewId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const [checks, setChecks] = useState<ChecklistState>(initialChecklist);
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [recommendation, setRecommendation] = useState<'Strong Hire' | 'Hire' | 'No Hire' | 'Strong No Hire'>('Hire');

  const [error, setError] = useState('');

  const load = async () => {
    if (!interviewId) return;
    try {
      setLoading(true);
      setError('');
      const res = await interviewApi.getRecruiterInterview(interviewId);
      const d = res.data as InterviewDetail;
      setDetail(d);

      if (!selectedRoundId && d.rounds?.length) {
        const inProgressRound =
          d.rounds.find((r) => r.result === 'pending') ?? d.rounds[d.rounds.length - 1];
        setSelectedRoundId(inProgressRound.id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const iv = setInterval(() => void load(), 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  const selectedRound = useMemo(
    () => detail?.rounds.find((r) => r.id === selectedRoundId) ?? null,
    [detail, selectedRoundId],
  );

  const checklistScore = useMemo(() => {
    const entries = Object.values(checks);
    const yes = entries.filter(Boolean).length;
    return Math.round((yes / entries.length) * 100);
  }, [checks]);

  const finalScore = useMemo(() => {
    const weighted = Math.round(checklistScore * 0.7 + recommendationWeight[recommendation] * 0.3);
    return Math.max(0, Math.min(100, weighted));
  }, [checklistScore, recommendation]);

  const suggestedResult = useMemo(() => {
    if (finalScore >= 85) return 'pass';
    if (finalScore >= 65) return 'pass';
    if (finalScore >= 45) return 'fail';
    return 'fail';
  }, [finalScore]);

  const suggestedStage: InterviewStage = useMemo(() => {
    if (recommendation === 'Strong Hire' || recommendation === 'Hire') return 'INTERVIEW_PASSED';
    return 'INTERVIEW_FAILED';
  }, [recommendation]);

  const toggle = (key: keyof ChecklistState) =>
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const validateMandatory = () => {
    if (!selectedRound) return 'Please select a round';
    if (!strengths.trim()) return 'Strengths are mandatory';
    if (!concerns.trim()) return 'Concerns are mandatory';
    if (!recommendation) return 'Recommendation is mandatory';
    return '';
  };

  const submitEvaluation = async () => {
    const v = validateMandatory();
    if (v) {
      setError(v);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const feedback = [
        `Recommendation: ${recommendation}`,
        `Checklist Score: ${checklistScore}`,
        `Final Score: ${finalScore}`,
        '',
        `Strengths: ${strengths.trim()}`,
        `Concerns: ${concerns.trim()}`,
        '',
        `Checklist:`,
        `- Joined on time: ${checks.joinedOnTime ? 'Yes' : 'No'}`,
        `- Introduction clarity: ${checks.introClarity ? 'Yes' : 'No'}`,
        `- DS/Algo understanding: ${checks.dsAlgo ? 'Yes' : 'No'}`,
        `- System design thinking: ${checks.systemDesign ? 'Yes' : 'No'}`,
        `- Debugging approach: ${checks.debugging ? 'Yes' : 'No'}`,
        `- Communication clarity: ${checks.communication ? 'Yes' : 'No'}`,
        `- Culture alignment: ${checks.cultureFit ? 'Yes' : 'No'}`,
        `- Confidence: ${checks.confidence ? 'Yes' : 'No'}`,
      ].join('\n');

      await interviewApi.submitRoundResult(selectedRound!.id, {
        result: suggestedResult as 'pass' | 'fail',
        score: finalScore,
        feedback,
      });

      await interviewApi.updateStage(interviewId!, suggestedStage);

      alert('Evaluation submitted successfully.');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  };

  const quickStage = async (stage: InterviewStage) => {
    try {
      setSaving(true);
      await interviewApi.updateStage(interviewId!, stage);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={styles.page}><div style={styles.muted}>Loading live interview panel…</div></main>;
  }

  if (!detail) {
    return <main style={styles.page}><div style={styles.error}>Interview not found</div></main>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>Live Interview Panel</h1>
          <div style={styles.muted}>
            Interview ID: <code>{detail.interview.id}</code>
          </div>
          <div style={{ ...styles.muted, marginTop: 4 }}>
            Current Stage: <strong style={{ color: '#38BDF8' }}>{detail.interview.current_stage}</strong> · Status Code: {detail.interview.status_code}
          </div>
        </div>

        <div style={styles.topActions}>
          <button style={styles.secondaryBtn} onClick={() => router.push('/recruiter/interviews')}>
            Back
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('INTERVIEW_IN_PROGRESS')} disabled={saving}>
            Mark In Progress
          </button>
          <button style={styles.secondaryBtn} onClick={() => void quickStage('ON_HOLD')} disabled={saving}>
            Put On Hold
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.grid}>
        {/* LEFT: Round + meeting + checklist */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Round Evaluation</h2>

          <label style={styles.label}>Select Round</label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
            style={styles.select}
          >
            {detail.rounds.map((r) => (
              <option key={r.id} value={r.id}>
                Round {r.round_number} · {r.round_type.toUpperCase()} · {r.result ?? 'pending'}
              </option>
            ))}
          </select>

          {selectedRound && (
            <div style={styles.roundMeta}>
              <div><strong>Scheduled:</strong> {selectedRound.scheduled_at ? new Date(selectedRound.scheduled_at).toLocaleString() : 'Not scheduled'}</div>
              <div><strong>Mode:</strong> {selectedRound.mode ?? '-'}</div>
              <div><strong>Duration:</strong> {selectedRound.duration_mins ?? '-'} mins</div>
              {selectedRound.meeting_join_url && (
                <a
                  href={selectedRound.meeting_join_url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.joinLink}
                >
                  Open Interview Room
                </a>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <h3 style={styles.h3}>Real Hiring Checklist</h3>
            <div style={styles.checkGrid}>
              <CheckRow label="Candidate joined on time" checked={checks.joinedOnTime} onChange={() => toggle('joinedOnTime')} />
              <CheckRow label="Introduction clarity" checked={checks.introClarity} onChange={() => toggle('introClarity')} />
              <CheckRow label="DS/Algo understanding" checked={checks.dsAlgo} onChange={() => toggle('dsAlgo')} />
              <CheckRow label="System design thinking" checked={checks.systemDesign} onChange={() => toggle('systemDesign')} />
              <CheckRow label="Debugging approach" checked={checks.debugging} onChange={() => toggle('debugging')} />
              <CheckRow label="Communication clarity" checked={checks.communication} onChange={() => toggle('communication')} />
              <CheckRow label="Culture alignment" checked={checks.cultureFit} onChange={() => toggle('cultureFit')} />
              <CheckRow label="Confidence" checked={checks.confidence} onChange={() => toggle('confidence')} />
            </div>
          </div>
        </section>

        {/* RIGHT: Final recommendation + notes + audit */}
        <section style={styles.card}>
          <h2 style={styles.h2}>Decision Notes</h2>

          <label style={styles.label}>Strengths (mandatory)</label>
          <textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Write key strengths observed..."
            style={styles.textarea}
          />

          <label style={styles.label}>Concerns (mandatory)</label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Write key concerns / gaps..."
            style={styles.textarea}
          />

          <label style={styles.label}>Hire Recommendation (mandatory)</label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as any)}
            style={styles.select}
          >
            <option>Strong Hire</option>
            <option>Hire</option>
            <option>No Hire</option>
            <option>Strong No Hire</option>
          </select>

          <div style={styles.scoreBox}>
            <div>Checklist Score: <strong>{checklistScore}</strong></div>
            <div>Final Score: <strong>{finalScore}</strong></div>
            <div>Suggested Result: <strong>{suggestedResult.toUpperCase()}</strong></div>
            <div>Suggested Stage: <strong>{suggestedStage}</strong></div>
          </div>

          <button style={styles.primaryBtn} onClick={() => void submitEvaluation()} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Evaluation & Update Stage'}
          </button>

          <div style={{ marginTop: 16 }}>
            <h3 style={styles.h3}>Recent Timeline</h3>
            <div style={styles.timeline}>
              {detail.events?.length ? (
                detail.events.slice(0, 12).map((e) => (
                  <div key={e.id} style={styles.timelineItem}>
                    <div style={{ fontWeight: 600 }}>{e.event_type}</div>
                    <div style={styles.mutedSmall}>
                      {e.from_stage ? `${e.from_stage} → ` : ''}{e.to_stage ?? '-'} · {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.muted}>No events yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={styles.checkRow}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
  },
  muted: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  mutedSmall: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  topActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  card: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10,
    background: 'rgba(255,255,255,.02)',
    padding: 14,
  },
  h2: {
    margin: '0 0 10px',
    fontSize: 16,
    fontWeight: 700,
  },
  h3: {
    margin: '0 0 8px',
    fontSize: 14,
    fontWeight: 700,
  },
  label: {
    display: 'block',
    fontSize: 12,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: '9px 10px',
    marginBottom: 10,
  },
  textarea: {
    width: '100%',
    minHeight: 90,
    resize: 'vertical',
    borderRadius: 8,
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    padding: 10,
    marginBottom: 10,
    fontFamily: 'inherit',
  },
  roundMeta: {
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    display: 'grid',
    gap: 6,
    background: 'rgba(56,189,248,.05)',
  },
  joinLink: {
    color: '#38BDF8',
    fontWeight: 700,
    textDecoration: 'none',
  },
  checkGrid: {
    display: 'grid',
    gap: 8,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.015)',
  },
  scoreBox: {
    marginTop: 8,
    marginBottom: 10,
    border: '1px solid rgba(167,139,250,.25)',
    background: 'rgba(167,139,250,.07)',
    borderRadius: 8,
    padding: 10,
    display: 'grid',
    gap: 4,
    fontSize: 13,
  },
  primaryBtn: {
    width: '100%',
    border: 'none',
    borderRadius: 8,
    padding: '10px 12px',
    background: '#22C55E',
    color: '#05240f',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    border: '1px solid rgba(255,255,255,.2)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'rgba(255,255,255,.04)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
  timeline: {
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 8,
    maxHeight: 240,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gap: 8,
  },
  timelineItem: {
    borderBottom: '1px dashed rgba(255,255,255,.12)',
    paddingBottom: 6,
  },
  error: {
    color: '#F87171',
  },
  errorBox: {
    marginBottom: 10,
    border: '1px solid rgba(248,113,113,.4)',
    background: 'rgba(248,113,113,.12)',
    color: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
};
]]>
</file>
<file name="frontend\hooks\useWebRTCRoom.ts">
<![CDATA[
'use client';

/**
 * useWebRTCRoom — Production WebRTC hook for interview video conferencing
 *
 * Architecture: Full-mesh WebRTC (each peer connects directly to every other peer)
 * Suitable for ≤6 participants. Beyond that, use an SFU (mediasoup, Livekit).
 *
 * Signal flow:
 *   1. Socket connects and authenticates via JWT
 *   2. Server sends room:snapshot with current participants
 *   3. For each existing participant: lower userId sends offer (avoids race)
 *   4. Receiving peer answers, ICE candidates exchanged
 *   5. WebRTC tracks flow directly peer-to-peer (bypassing server)
 *
 * Key design decisions:
 *   - RTCPeerConnection per remote peer (not shared)
 *   - ICE candidate queuing until remote description is set (critical fix)
 *   - Screen sharing replaces video track in existing senders (no renegotiation needed)
 *   - Exponential backoff reconnection for Socket.io
 *   - Refs for all mutable state touched in async callbacks (avoids stale closures)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Public types ─────────────────────────────────────────────────────────────

export type RemotePeer = {
  userId: string;
  stream: MediaStream | null;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

export type ChatMessage = {
  userId: string;
  name: string;
  role?: string;
  message: string;
  timestamp: string;
};

export type ConnectionState =
  | 'idle'
  | 'acquiring-media'
  | 'connecting-socket'
  | 'joining-room'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'left';

type ParticipantSnapshot = {
  userId: string;
  name?: string;
  role?: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
};

type UseWebRTCRoomArgs = {
  roomId: string;
  user: { id: string; full_name?: string; role?: string } | null;
};

// ─── ICE configuration ────────────────────────────────────────────────────────
// For production, configure TURN servers via the NEXT_PUBLIC_TURN_SERVERS env var.
// Example (stringified JSON array):
// NEXT_PUBLIC_TURN_SERVERS=[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]
// STUN alone fails across some NATs; TURN improves connectivity reliability.

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

let TURN_SERVERS: RTCIceServer[] = [];
try {
  const raw = process.env.NEXT_PUBLIC_TURN_SERVERS;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) TURN_SERVERS = parsed as RTCIceServer[];
  }
} catch (err) {
  // Non-fatal: fall back to STUN-only
  // eslint-disable-next-line no-console
  console.warn('Failed to parse NEXT_PUBLIC_TURN_SERVERS:', err);
}

const ICE_SERVERS: RTCIceServer[] = [
  ...DEFAULT_STUN_SERVERS,
  ...TURN_SERVERS,
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// ─── Media constraints ────────────────────────────────────────────────────────

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: 'user',
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

// ─── Internal state types ─────────────────────────────────────────────────────

type PeerState = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescSet: boolean;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCRoom({ roomId, user }: UseWebRTCRoomArgs) {
  // ── Public state ───────────────────────────────────────────────────────────
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string>('');
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [roomEnded, setRoomEnded] = useState(false);

  // ── Internal refs (not reactive — used in async callbacks) ────────────────
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const savedCamTrackRef = useRef<MediaStreamTrack | null>(null);

  // userId → PeerState
  const peersRef = useRef<Map<string, PeerState>>(new Map());

  // Stable copies of toggle state for closures
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);
  const screenSharingRef = useRef(false);
  const userIdRef = useRef(user?.id ?? '');

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);
  useEffect(() => { screenSharingRef.current = screenSharing; }, [screenSharing]);
  useEffect(() => { userIdRef.current = user?.id ?? ''; }, [user?.id]);

  // ── Utility: update a single peer in state ─────────────────────────────────
  const updatePeer = useCallback((userId: string, patch: Partial<RemotePeer>) => {
    setPeers(prev =>
      prev.map(p => p.userId === userId ? { ...p, ...patch } : p)
    );
  }, []);

  const removePeer = useCallback((userId: string) => {
    const ps = peersRef.current.get(userId);
    if (ps) {
      ps.pc.close();
      peersRef.current.delete(userId);
    }
    setPeers(prev => prev.filter(p => p.userId !== userId));
  }, []);

  // ── Create RTCPeerConnection for a remote user ────────────────────────────
  const createPC = useCallback((
    remoteUserId: string,
    socket: Socket,
  ): PeerState => {
    // Clean up any existing connection
    const existing = peersRef.current.get(remoteUserId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(remoteUserId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const state: PeerState = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      iceCandidateQueue: [],
      remoteDescSet: false,
    };
    peersRef.current.set(remoteUserId, state);

    // Add local tracks immediately so remote can receive them
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    // ICE candidates
    pc.onicecandidate = (evt) => {
      if (!evt.candidate) return;
      socket.emit('interview:ice-candidate', {
        roomId,
        targetUserId: remoteUserId,
        candidate: evt.candidate.toJSON(),
      });
    };

    pc.onicecandidateerror = (evt) => {
      // Non-fatal; some ICE errors are expected (e.g., failed STUN checks)
      if ((evt as RTCPeerConnectionIceErrorEvent).errorCode !== 701) {
        console.warn('[ICE] Candidate error:', evt);
      }
    };

    // Receive remote tracks
    pc.ontrack = (evt) => {
      const [stream] = evt.streams;
      if (!stream) return;

      setPeers(prev => {
        const exists = prev.find(p => p.userId === remoteUserId);
        if (exists) {
          return prev.map(p =>
            p.userId === remoteUserId ? { ...p, stream } : p
          );
        }
        return [...prev, {
          userId: remoteUserId,
          stream,
          micOn: true,
          camOn: true,
          screenSharing: false,
        }];
      });
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      console.debug(`[PC:${remoteUserId}] connectionState → ${cs}`);

      if (cs === 'failed') {
        // Attempt ICE restart
        console.warn(`[PC:${remoteUserId}] Connection failed — restarting ICE`);
        pc.restartIce();
      }
      if (cs === 'closed') {
        removePeer(remoteUserId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (state.makingOffer) return;
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return; // Collided — abort
        await pc.setLocalDescription(offer);
        socket.emit('interview:offer', {
          roomId,
          targetUserId: remoteUserId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`[PC:${remoteUserId}] Negotiation error:`, err);
      } finally {
        state.makingOffer = false;
      }
    };

    return state;
  }, [removePeer, roomId]);

  // ── Process queued ICE candidates after remote description is set ─────────
  const drainIceQueue = useCallback(async (state: PeerState, remoteUserId: string) => {
    const candidates = [...state.iceCandidateQueue];
    state.iceCandidateQueue = [];
    for (const candidate of candidates) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error(`[PC:${remoteUserId}] ICE queue drain error:`, err);
      }
    }
  }, []);

  // ── Acquire local media ────────────────────────────────────────────────────
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) return localStreamRef.current;

    setConnectionState('acquiring-media');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: VIDEO_CONSTRAINTS,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    setMicOn(stream.getAudioTracks().every(t => t.enabled));
    setCamOn(stream.getVideoTracks().every(t => t.enabled));
    return stream;
  }, []);

  // ── Connect and join room ──────────────────────────────────────────────────
  const join = useCallback(async () => {
    if (!user?.id || !roomId) return;
    if (socketRef.current?.connected) return; // Already connected

    try {
      setError('');

      // 1. Get local media
      await acquireMedia();

      // 2. Connect socket
      setConnectionState('connecting-socket');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api')
        .replace(/\/api\/?$/, '');

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('jc_token') ?? ''
        : '';

      const socket: Socket = io(`${apiBase}/interview`, {
        transports: ['websocket'],
        withCredentials: true,
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10_000,
        timeout: 15_000,
      });
      socketRef.current = socket;

      // ── Socket event handlers ──────────────────────────────────────────────

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnectionState('joining-room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] connect_error:', err.message);
        setError(`Cannot connect to signaling server: ${err.message}`);
        setConnectionState('error');
      });

      socket.on('disconnect', (reason) => {
        console.warn('[Socket] Disconnected:', reason);
        if (reason !== 'io client disconnect') {
          setConnectionState('reconnecting');
        }
      });

      socket.on('reconnect', () => {
        console.log('[Socket] Reconnected — rejoining room');
        socket.emit('interview:join-room', {
          roomId,
          name: user.full_name,
        });
      });

      socket.on('interview:error', (data: { message: string }) => {
        setError(data.message);
        setConnectionState('error');
      });

      // Room snapshot: current participants when we join
      socket.on('interview:room-snapshot', async (data: { participants: ParticipantSnapshot[] }) => {
        setConnectionState('connected');
        setRoomEnded(false);

        const others = data.participants.filter(p => p.userId !== user.id);

        // Update metadata for existing peers
        setPeers(prev => {
          const existing = new Map(prev.map(p => [p.userId, p]));
          for (const snap of others) {
            const e = existing.get(snap.userId);
            if (e) {
              existing.set(snap.userId, { ...e, ...snap });
            } else {
              existing.set(snap.userId, {
                userId: snap.userId,
                stream: null,
                name: snap.name,
                role: snap.role,
                micOn: snap.micOn,
                camOn: snap.camOn,
                screenSharing: snap.screenSharing,
              });
            }
          }
          return Array.from(existing.values());
        });

        // Polite peer model: lower userId is the "polite" peer (waits)
        // Higher userId sends the offer (initiates)
        for (const participant of others) {
          if (user.id > participant.userId) {
            // We are the impolite peer — send the offer
            const ps = createPC(participant.userId, socket);
            try {
              ps.makingOffer = true;
              const offer = await ps.pc.createOffer();
              await ps.pc.setLocalDescription(offer);
              socket.emit('interview:offer', {
                roomId,
                targetUserId: participant.userId,
                sdp: ps.pc.localDescription,
              });
            } catch (err) {
              console.error(`[PC:${participant.userId}] Initial offer failed:`, err);
            } finally {
              ps.makingOffer = false;
            }
          }
          // Polite peer (lower userId) waits for incoming offer
        }
      });

      // New participant joined after us
      socket.on('interview:user-joined', async (data: { participant: ParticipantSnapshot }) => {
        const { participant } = data;
        if (participant.userId === user.id) return;

        // Add to peer list (no stream yet)
        setPeers(prev => {
          if (prev.some(p => p.userId === participant.userId)) return prev;
          return [...prev, {
            userId: participant.userId,
            stream: null,
            name: participant.name,
            role: participant.role,
            micOn: participant.micOn,
            camOn: participant.camOn,
            screenSharing: participant.screenSharing,
          }];
        });

        // If we are the impolite peer (higher userId), send offer
        if (user.id > participant.userId) {
          const ps = createPC(participant.userId, socket);
          try {
            ps.makingOffer = true;
            const offer = await ps.pc.createOffer();
            await ps.pc.setLocalDescription(offer);
            socket.emit('interview:offer', {
              roomId,
              targetUserId: participant.userId,
              sdp: ps.pc.localDescription,
            });
          } catch (err) {
            console.error(`[PC:${participant.userId}] Offer error on join:`, err);
          } finally {
            ps.makingOffer = false;
          }
        }
      });

      // Incoming offer (from impolite peer)
      socket.on('interview:offer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        let ps = peersRef.current.get(data.fromUserId);
        if (!ps) {
          ps = createPC(data.fromUserId, socket);
        }

        const { pc } = ps;
        const offerCollision =
          data.sdp.type === 'offer' &&
          (ps.makingOffer || pc.signalingState !== 'stable');

        // Polite peer ignores colliding offers; impolite peer rolls back
        const isPolite = user.id < data.fromUserId;
        ps.ignoreOffer = !isPolite && offerCollision;
        if (ps.ignoreOffer) return;

        try {
          if (offerCollision) {
            // Rollback for polite peer
            await pc.setLocalDescription({ type: 'rollback' });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('interview:answer', {
            roomId,
            targetUserId: data.fromUserId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] offer handling error:`, err);
        }
      });

      // Incoming answer
      socket.on('interview:answer', async (data: {
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps || ps.ignoreOffer) return;
        try {
          await ps.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          ps.remoteDescSet = true;
          await drainIceQueue(ps, data.fromUserId);
        } catch (err) {
          console.error(`[PC:${data.fromUserId}] answer handling error:`, err);
        }
      });

      // ICE candidates
      socket.on('interview:ice-candidate', async (data: {
        fromUserId: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const ps = peersRef.current.get(data.fromUserId);
        if (!ps) return;

        // Queue until remote description is set (critical — prevents ordering issues)
        if (!ps.remoteDescSet || ps.pc.remoteDescription === null) {
          ps.iceCandidateQueue.push(data.candidate);
          return;
        }

        try {
          await ps.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          if (!ps.ignoreOffer) {
            console.error(`[PC:${data.fromUserId}] ICE candidate error:`, err);
          }
        }
      });

      // Participant left
      socket.on('interview:user-left', (data: { userId: string }) => {
        removePeer(data.userId);
      });

      // Media state changes
      socket.on('interview:user-media-toggled', (data: {
        userId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing: boolean;
      }) => {
        updatePeer(data.userId, {
          micOn: data.micOn,
          camOn: data.camOn,
          screenSharing: data.screenSharing,
        });
      });

      // In-room chat
      socket.on('interview:chat-message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on('interview:room-status', (data: {
        hostUserId: string | null;
        hostPresent: boolean;
        ended: boolean;
      }) => {
        setHostUserId(data.hostUserId ?? null);
        setHostPresent(!!data.hostPresent);
        if (data.ended) {
          setRoomEnded(true);
          setConnectionState('left');
        }
      });

      socket.on('interview:room-ended', () => {
        setRoomEnded(true);
        setConnectionState('left');
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      setError(msg);
      setConnectionState('error');
      console.error('[useWebRTCRoom] join error:', err);
    }
  }, [acquireMedia, createPC, drainIceQueue, removePeer, roomId, updatePeer, user]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leave = useCallback(() => {
    // Signal leave before disconnecting
    socketRef.current?.emit('interview:leave-room', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    // Close all peer connections
    for (const [, ps] of peersRef.current) {
      ps.pc.close();
    }
    peersRef.current.clear();

    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    savedCamTrackRef.current = null;

    setLocalStream(null);
    setPeers([]);
    setMessages([]);
    setScreenSharing(false);
    setHostPresent(false);
    setHostUserId(null);
    setRoomEnded(false);
    setConnectionState('left');
  }, [roomId]);

  // ── Mic toggle ─────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOnRef.current;
    stream.getAudioTracks().forEach(t => (t.enabled = next));
    setMicOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: next,
      camOn: camOnRef.current,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Camera toggle ──────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOnRef.current;
    // Only toggle the actual track if not screen sharing
    if (!screenSharingRef.current) {
      stream.getVideoTracks().forEach(t => (t.enabled = next));
    }
    setCamOn(next);
    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: next,
      screenSharing: screenSharingRef.current,
    });
  }, [roomId]);

  // ── Screen share start ─────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (screenSharingRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 15 },
        },
        audio: {
          echoCancellation: false,
          suppressLocalAudioPlayback: false,
        } as any,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as any);

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save current camera track before replacing
      const localVidTrack = localStreamRef.current?.getVideoTracks()[0];
      if (localVidTrack) {
        savedCamTrackRef.current = localVidTrack;
      }

      // Replace video track in all PeerConnections
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(screenTrack));
        }
      }
      await Promise.allSettled(replaceOps);

      // Also update local stream for preview
      if (localStreamRef.current) {
        const local = localStreamRef.current;
        local.getVideoTracks().forEach(t => {
          t.enabled = false; // pause camera
        });
      }

      // Replace in local stream for preview
      const newStream = new MediaStream([
        ...(localStreamRef.current?.getAudioTracks() ?? []),
        screenTrack,
      ]);
      localStreamRef.current = newStream;
      setLocalStream(new MediaStream(newStream.getTracks()));
      setScreenSharing(true);

      // Auto-stop when browser's native "Stop sharing" is clicked
      screenTrack.addEventListener('ended', () => {
        void stopScreenShare();
      });

      socketRef.current?.emit('interview:toggle-media', {
        roomId,
        micOn: micOnRef.current,
        camOn: camOnRef.current,
        screenSharing: true,
      });
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        setError('Screen share unavailable. Check browser permissions.');
        console.error('[Screen share] error:', err);
      }
    }
  }, [roomId]); // stopScreenShare is defined below; safe because it's only called via event listener

  // ── Screen share stop ──────────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    if (!screenSharingRef.current) return;

    // Stop screen stream tracks
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;

    // Restore camera
    let cameraTrack: MediaStreamTrack | null = savedCamTrackRef.current;
    savedCamTrackRef.current = null;

    // If saved track ended (user had video off), try to get a new one
    if (!cameraTrack || cameraTrack.readyState === 'ended') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
        });
        cameraTrack = s.getVideoTracks()[0] ?? null;
      } catch {
        cameraTrack = null;
      }
    }

    // Replace back in all PeerConnections
    if (cameraTrack) {
      cameraTrack.enabled = camOnRef.current;
      const replaceOps: Promise<void>[] = [];
      for (const [, ps] of peersRef.current) {
        const sender = ps.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replaceOps.push(sender.replaceTrack(cameraTrack!));
        }
      }
      await Promise.allSettled(replaceOps);
    }

    // Restore local stream
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    const newTracks = cameraTrack ? [...audioTracks, cameraTrack] : audioTracks;
    const restored = new MediaStream(newTracks);
    localStreamRef.current = restored;
    setLocalStream(new MediaStream(restored.getTracks()));
    setScreenSharing(false);

    socketRef.current?.emit('interview:toggle-media', {
      roomId,
      micOn: micOnRef.current,
      camOn: camOnRef.current,
      screenSharing: false,
    });
  }, [roomId]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendMessage = useCallback((message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !socketRef.current?.connected) return;
    socketRef.current.emit('interview:chat-message', { roomId, message: trimmed });
  }, [roomId]);

  const endRoom = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('interview:end-room', { roomId });
  }, [roomId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    connectionState,
    connected: connectionState === 'connected',
    connecting: connectionState === 'connecting-socket' || connectionState === 'joining-room' || connectionState === 'acquiring-media',
    localStream,
    peers,
    messages,
    micOn,
    camOn,
    screenSharing,
    error,
    hostUserId,
    hostPresent,
    roomEnded,
    canEndRoom: user?.role === 'recruiter' && !!hostUserId && user?.id === hostUserId,
    // Actions
    join,
    leave,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    endRoom,
  };
}
]]>
</file>
<file name="frontend\lib\interviews.api.ts">
<![CDATA[
import api from './axios';

export type Stage =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_PASSED'
  | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN';

export const InterviewsApi = {
  // Mock interview
  startMockSession: (payload: {
    jobTitle: string;
    company: string;
    sessionType?: string;
    jobId?: string;
  }) => api.post('/interviews/sessions', payload),

  submitMockAnswer: (questionId: string, payload: { answer: string; timeTakenSecs: number }) =>
    api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) => api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter
  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${applicationId}/init`),

  scheduleRound: (
    interviewId: string,
    payload: {
      roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
      scheduledAt: string;
      durationMins?: number;
      mode?: 'video' | 'phone' | 'offline';
      interviewerId?: string;
    },
  ) => api.post(`/recruiter/interviews/${interviewId}/rounds`, payload),

  updateStage: (interviewId: string, stage: Stage) =>
    api.patch(`/recruiter/interviews/${interviewId}/stage`, { stage }),

  submitRoundResult: (
    roundId: string,
    payload: {
      result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
      score?: number;
      feedback?: string;
    },
  ) => api.patch(`/recruiter/interviews/rounds/${roundId}/result`, payload),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', { params: { jobId } }),

  listRecruiterInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate (FIXED)
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),

  // Room access (recommended)
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),
};
]]>
</file>
<file name="frontend\lib\axios.ts">
<![CDATA[
// lib/axios.ts — THE SINGLE HTTP CLIENT
// baseURL already includes /api — never append /api in call sites.

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT on every outbound request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401 — fires for EVERY request in the app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jc_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// Interview API helpers (mock + real recruiter/candidate process)
// ─────────────────────────────────────────────────────────────────────────────

export type InterviewStage =
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS'
  | 'INTERVIEW_PASSED'
  | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN';

export const interviewApi = {
  // Mock interview
  startMockSession: (payload: {
    jobTitle: string;
    company: string;
    sessionType?: string;
    jobId?: string;
  }) => api.post('/interviews/sessions', payload),

  submitMockAnswer: (
    questionId: string,
    payload: { answer: string; timeTakenSecs: number },
  ) => api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) => api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter
  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${applicationId}/init`),

  scheduleRound: (
    interviewId: string,
    payload: {
      roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
      scheduledAt: string;
      durationMins?: number;
      mode?: 'video' | 'phone' | 'offline';
      interviewerId?: string;
    },
  ) => api.post(`/recruiter/interviews/${interviewId}/rounds`, payload),

  updateStage: (interviewId: string, stage: InterviewStage) =>
    api.patch(`/recruiter/interviews/${interviewId}/stage`, { stage }),

  submitRoundResult: (
    roundId: string,
    payload: {
      result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
      score?: number;
      feedback?: string;
    },
  ) => api.patch(`/recruiter/interviews/rounds/${roundId}/result`, payload),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', { params: { jobId } }),

  listRecruiterInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate (FIXED: no recruiter namespace)
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),

  // Room access (recommended)
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),
};
]]>
</file>
<file name="frontend\app\(protected)\layout.tsx">
<![CDATA[
'use client';

// frontend/app/(protected)/layout.tsx
//
// Change from previous version — one addition only:
//   1. Import ProfilePanelProvider from context
//   2. Wrap the layout return with <ProfilePanelProvider>
//
// Why this is needed:
//   ProfilePanelContext provides the open/closePanel state that connects
//   the Sidebar username card (consumer: openPanel) to the ProfilePanel
//   drawer (consumer: open state) inside each dashboard page.
//
//   The provider MUST live above both the Sidebar and the page children
//   in the tree — this layout is exactly the right place because it wraps
//   every protected route and renders the Sidebar directly.
//
//   Without this wrapper, useProfilePanel() returns the default no-op
//   values and clicking the username card does nothing.

import { useEffect }                from 'react';
import { useRouter }                from 'next/navigation';
import { useAuth }                  from '@/components/providers/AuthProvider';
import { Sidebar }                  from '@/app/_components/shared/Sidebar';
import { useJobStream }             from '@/hooks/useJobStream';
import { ProfilePanelProvider }     from '@/components/context/ProfilePanelContext'; // ← new

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LayoutSkeleton() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070B14' }}>
      <div style={{
        width: '240px', minHeight: '100vh',
        background: '#0D1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, padding: '2rem' }}>
        <div style={{
          height: '32px', width: '200px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)', marginBottom: '1rem',
          animation: 'skPulse 1.5s ease infinite',
        }} />
        <div style={{
          height: '200px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          animation: 'skPulse 1.5s ease infinite',
        }} />
      </div>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ── Protected Layout ──────────────────────────────────────────────────────────

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router            = useRouter();

  // SSE connection — one hook call activates real-time for ALL protected pages.
  // Only fires after auth resolves (user exists). EventSource auto-reconnects.
  // When server emits job_created / jobs_synced / alert → SWR revalidates.
  useJobStream();

  // Redirect unauthenticated users to landing
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/?auth=login');
    }
  }, [user, loading, router]);

  if (loading) return <LayoutSkeleton />;
  if (!user)   return null;

  return (
    // ── ProfilePanelProvider wraps Sidebar + children so both can reach
    //    the same open/closePanel state via useProfilePanel().
    //
    //    Sidebar  →  calls openPanel()  when username card is clicked
    //    Dashboard pages  →  render <ProfilePanel /> which reads open state
    //
    //    Both are subtrees of this provider, so context is shared correctly.
    <ProfilePanelProvider>
      <div style={{
        display:    'flex',
        minHeight:  '100vh',
        background: '#070B14',
        fontFamily: "'Sora', sans-serif",
      }}>
        <Sidebar />
        <div style={{
          flex:          1,
          minWidth:      0,
          display:       'flex',
          flexDirection: 'column',
          overflowY:     'auto',
          overflowX:     'hidden',
          minHeight:     '100vh',
        }}>
          {children}
        </div>
      </div>
    </ProfilePanelProvider>
  );
}
]]>
</file>
<file name="frontend\app\interview\room\[roomId]\page.tsx">
<![CDATA[
"use client";
import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import useWebRTC from '../../../../components/interview/useWebRTC';
import VideoGrid from '../../../../components/interview/VideoGrid';
import Controls from '../../../../components/interview/Controls';
import Sidebar from '../../../../components/interview/Sidebar';

export default function RoomPage() {
  const params = useParams();
  const roomId = (params as any)?.roomId as string;

  const {
    localStream,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCam,
    isMicOn,
    isCamOn,
  } = useWebRTC();

  useEffect(() => {
    if (!roomId) return;
    // join with default display name — client should replace with real user name
    void joinRoom(roomId, { displayName: 'Me' });

    return () => {
      void leaveRoom(roomId);
    };
  }, [roomId]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <main style={{ flex: 1, padding: 8 }}>
        <VideoGrid localStream={localStream} remoteStreams={remoteStreams} />
        <div style={{ position: 'absolute', left: '50%', bottom: 16, transform: 'translateX(-50%)' }}>
          <Controls
            isMicOn={isMicOn}
            isCamOn={isCamOn}
            onToggleMic={() => toggleMic()}
            onToggleCam={() => toggleCam()}
          />
        </div>
      </main>
      <aside style={{ width: 360, borderLeft: '1px solid #eee' }}>
        <Sidebar />
      </aside>
    </div>
  );
}

]]>
</file>
<file name="frontend\app\interview\waiting-room\page.tsx">
<![CDATA[
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WaitingRoomPage() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  function handleJoin() {
    if (!roomId) return;
    router.push(`/interview/room/${encodeURIComponent(roomId)}`);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Interview Waiting Room</h1>
      <p>Enter the interview room id or join URL slug provided by the recruiter.</p>
      <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="jc-<interviewId>-r1 or room UUID" />
      <div style={{ marginTop: 12 }}>
        <button onClick={handleJoin}>Join Room</button>
      </div>
    </div>
  );
}

]]>
</file>
<file name="ts-api\src\app.module.ts">
<![CDATA[
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/app.module.ts

import { Module }                    from '@nestjs/common';
import { APP_GUARD }                 from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule }                from '@nestjs/bullmq';
import { ScheduleModule }            from '@nestjs/schedule';  // ← add this

import configuration                 from './config/configuration';
import { DatabaseModule }            from './database/datbase.module';
import { AuthModule }                from './auth/auth.module';
import { ResumesModule }             from './resumes/resumes.module';
import { JobsModule }                from './jobs/jobs.module';
import { AlertsModule }              from './alerts/alerts.module';
import { CandidatesModule }          from './candidates/candidates.module';
import { RecruitersModule }          from './recruiters/recruiters.module';
import { InterviewsModule }          from './interviews/interviews.module';
import { RecommendationsModule }     from './recommendations/recommendatyions.module';
import { OllamaModule }              from './ollama/ollama.module';
import { PrismaModule }              from '../prisma/prisma.module';
import { JwtAuthGuard }              from './auth/guards/jwt-auth.guard';
import { RolesGuard }                from './auth/guards/roles.guard';  // ← add this

const REDIS_ENABLED =
  process.env.REDIS_ENABLED === 'true' ||
  !!process.env.REDIS_URL ||
  !!process.env.REDIS_HOST;

@Module({
  imports: [
    // ── Global config ───────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load:     [configuration],
    }),

    // ── Cron scheduler — required for JobsSyncService @Cron ─────────────────
    ScheduleModule.forRoot(),

    // ── BullMQ — enabled only when Redis is configured ──────────────────────
    ...(REDIS_ENABLED
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject:  [ConfigService],
            useFactory: (config: ConfigService) => {
              const redisUrl = config.get<string>('redis.url');

              // Prefer connection URL (Upstash/Railway provide this)
              if (redisUrl) {
                return {
                  connection: { url: redisUrl },
                  defaultJobOptions: {
                    attempts:         3,
                    backoff:          { type: 'exponential', delay: 5_000 },
                    removeOnComplete: 100,
                    removeOnFail:     50,
                  },
                };
              }

              const redis = config.get('redis');
              return {
                connection: {
                  host:     redis.host,
                  port:     redis.port,
                  password: redis.password,
                  ...(redis.tls && { tls: { rejectUnauthorized: false } }),
                },
                defaultJobOptions: {
                  attempts:         3,
                  backoff:          { type: 'exponential', delay: 5_000 },
                  removeOnComplete: 100,
                  removeOnFail:     50,
                },
              };
            },
          }),
        ]
      : []),

    // ── Feature modules ──────────────────────────────────────────────────────
    PrismaModule,
    DatabaseModule,
    OllamaModule,
    AlertsModule,
    AuthModule,
    ResumesModule,
    JobsModule,
    CandidatesModule,
    RecruitersModule,
    InterviewsModule,
    RecommendationsModule,
  ],

  providers: [
    // Guard execution order matters — JWT authenticates first,
    // Roles authorises second. NestJS respects registration order.
    {
      provide:  APP_GUARD,
      useClass: JwtAuthGuard,   // Step 1: validates token → sets request.user
    },
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,     // Step 2: checks request.user.role vs @Roles()
    },
  ],
})
export class AppModule {}
]]>
</file>
<file name="frontend\middleware.ts">
<![CDATA[
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All protected route prefixes
const PROTECTED = [
  '/dashboard',
  '/jobs',
  '/profile',
  '/resumes',
  '/resume',
  '/settings',
  '/mock-interview',
  '/recommendations',
  '/alerts',
  '/analyze',
  '/interviews',
  '/recruiter',
  '/candidate',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('jc_token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/profile/:path*',
    '/resumes/:path*',
    '/resume/:path*',
    '/settings/:path*',
    '/mock-interview/:path*',
    '/recommendations/:path*',
    '/alerts/:path*',
    '/analyze/:path*',
    '/interviews/:path*',
    '/recruiter/:path*',
    '/candidate/:path*',
  ],
};
]]>
</file>
</files>