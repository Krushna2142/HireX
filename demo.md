```
// ============================================================
// JobCrawler Fresh DB Prisma Schema
// Use this for NEW Supabase PostgreSQL DB only.
// Old exposed DB must not be reused for auth/session/token data.
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// -----------------------------
// Enums
// -----------------------------

enum UserRole {
  JOBSEEKER
  RECRUITER
  ADMIN
  SUPER_ADMIN

  @@map("user_role")
}

enum AuthProvider {
  CREDENTIALS
  GOOGLE
  GITHUB

  @@map("auth_provider")
}

enum ResumeAnalysisStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED

  @@map("resume_analysis_status")
}

enum JobStatus {
  DRAFT
  PUBLISHED
  PAUSED
  CLOSED
  ARCHIVED

  @@map("job_status")
}

enum ApplicationStatus {
  APPLIED
  UNDER_REVIEW
  SHORTLISTED
  REJECTED
  INTERVIEW_SCHEDULED
  INTERVIEW_IN_PROGRESS
  INTERVIEW_PASSED
  INTERVIEW_FAILED
  FINAL_REVIEW
  OFFERED
  HIRED
  ON_HOLD
  WITHDRAWN

  @@map("application_status")
}

enum InterviewType {
  AI_MOCK
  RECRUITER_LIVE
  TECHNICAL
  HR
  FINAL

  @@map("interview_type")
}

enum InterviewStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("interview_status")
}

enum InterviewRoundResult {
  PENDING
  PASSED
  FAILED
  CANCELLED
  NO_SHOW

  @@map("interview_round_result")
}

enum NotificationType {
  AUTH
  APPLICATION
  INTERVIEW
  JOB
  RESUME
  ADMIN
  SYSTEM

  @@map("notification_type")
}

enum NotificationChannel {
  IN_APP
  EMAIL

  @@map("notification_channel")
}

// -----------------------------
// Identity + Auth Foundation
// -----------------------------

model User {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email             String    @unique @db.Citext
  passwordHash      String?   @map("password_hash")
  fullName          String?   @map("full_name") @db.VarChar(160)
  avatarUrl         String?   @map("avatar_url")

  role              UserRole  @default(JOBSEEKER)

  emailVerified     Boolean   @default(false) @map("email_verified")
  emailVerifiedAt   DateTime? @map("email_verified_at") @db.Timestamptz(6)
  passwordChangedAt DateTime? @map("password_changed_at") @db.Timestamptz(6)

  isActive          Boolean   @default(true) @map("is_active")
  isBlocked         Boolean   @default(false) @map("is_blocked")
  blockedReason     String?   @map("blocked_reason")
  deactivatedAt     DateTime? @map("deactivated_at") @db.Timestamptz(6)
  deletedAt         DateTime? @map("deleted_at") @db.Timestamptz(6)

  legacyImported    Boolean   @default(false) @map("legacy_imported")
  legacySourceId    String?   @map("legacy_source_id")

  lastLoginAt       DateTime? @map("last_login_at") @db.Timestamptz(6)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  profile           UserProfile?
  jobseekerProfile  JobseekerProfile?
  recruiterProfile  RecruiterProfile?

  authAccounts      AuthAccount[]
  authSessions      AuthSession[]
  refreshTokens     AuthRefreshToken[]
  emailTokens       EmailVerificationToken[]
  passwordTokens    PasswordResetToken[]
  loginAttempts     LoginAttempt[]

  auditLogsAsActor  AuditLog[] @relation("AuditActor")
  auditLogsAsTarget AuditLog[] @relation("AuditTarget")

  resumes           Resume[]
  jobsPosted        Job[] @relation("RecruiterJobs")
  applications      JobApplication[] @relation("CandidateApplications")
  statusEvents      CandidateStatusEvent[] @relation("StatusChangedBy")

  interviewsAsCandidate Interview[] @relation("InterviewCandidate")
  interviewsAsRecruiter Interview[] @relation("InterviewRecruiter")
  interviewsCreated     Interview[] @relation("InterviewCreator")

  interviewRoomsHosted  InterviewRoom[] @relation("RoomHost")
  roomParticipants      RoomParticipant[]
  scorecardsCreated     InterviewScorecard[] @relation("ScorecardCreator")
  chatMessages          InterviewChatMessage[] @relation("ChatSender")
  interviewEvents       InterviewEventLog[] @relation("InterviewEventActor")
  recruiterNotes        RecruiterInterviewNote[] @relation("RecruiterNoteAuthor")

  notifications      Notification[]

  @@index([role], map: "idx_users_role")
  @@index([emailVerified], map: "idx_users_email_verified")
  @@index([isActive, isBlocked], map: "idx_users_active_blocked")
  @@index([createdAt], map: "idx_users_created_at")
  @@map("users")
}

model UserProfile {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @unique @map("user_id") @db.Uuid
  phone       String?  @db.VarChar(30)
  location    String?  @db.VarChar(180)
  bio         String?
  websiteUrl  String?  @map("website_url")
  linkedinUrl String?  @map("linkedin_url")
  githubUrl   String?  @map("github_url")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model JobseekerProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  headline           String?  @db.VarChar(220)
  bio                String?
  photoUrl           String?  @map("photo_url")
  location           String?
  phone              String?
  currentEducation   String?  @map("current_education")
  availability       String   @default("immediate")
  targetRoles        String[] @default([]) @map("target_roles")
  targetIndustries   String[] @default([]) @map("target_industries")
  employmentTypes    String[] @default([]) @map("employment_types")
  workMode           String?  @map("work_mode")
  salaryMin          Int?     @map("salary_min")
  salaryMax          Int?     @map("salary_max")
  salaryCurrency     String   @default("INR") @map("salary_currency")
  salaryNegotiable   Boolean  @default(true) @map("salary_negotiable")
  willingToRelocate  Boolean  @default(false) @map("willing_to_relocate")
  preferredLocations String[] @default([]) @map("preferred_locations")
  currentTitle       String?  @map("current_title")
  currentCompany     String?  @map("current_company")
  experienceYears    Float?   @map("experience_years")
  experienceLevel    String?  @map("experience_level")
  topSkills          String[] @default([]) @map("top_skills")
  activeResumeId     String?  @map("active_resume_id") @db.Uuid
  openToWork         Boolean  @default(true) @map("open_to_work")
  isVisible          Boolean  @default(true) @map("is_visible")
  profileCompletion  Int      @default(0) @map("profile_completion")
  lastActiveAt       DateTime @default(now()) @map("last_active_at") @db.Timestamptz(6)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([openToWork], map: "idx_jobseeker_profiles_open_to_work")
  @@index([isVisible], map: "idx_jobseeker_profiles_visible")
  @@map("jobseeker_profiles")
}

model RecruiterProfile {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @unique @map("user_id") @db.Uuid
  title              String?
  photoUrl           String?  @map("photo_url")
  phone              String?
  linkedinUrl        String?  @map("linkedin_url")
  isVerified         Boolean  @default(false) @map("is_verified")
  verifiedRecruiter  Boolean  @default(false) @map("verified_recruiter")
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
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([verifiedRecruiter], map: "idx_recruiter_profiles_verified")
  @@map("recruiter_profiles")
}

model AuthAccount {
  id                    String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String       @map("user_id") @db.Uuid
  provider              AuthProvider
  providerAccountId     String?      @map("provider_account_id")
  providerEmail         String?      @map("provider_email") @db.Citext
  providerEmailVerified Boolean      @default(false) @map("provider_email_verified")
  linkedAt              DateTime     @default(now()) @map("linked_at") @db.Timestamptz(6)
  lastUsedAt            DateTime?    @map("last_used_at") @db.Timestamptz(6)
  createdAt             DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)

  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId], map: "uq_auth_accounts_provider_account")
  @@unique([userId, provider], map: "uq_auth_accounts_user_provider")
  @@index([userId], map: "idx_auth_accounts_user_id")
  @@index([providerEmail], map: "idx_auth_accounts_provider_email")
  @@map("auth_accounts")
}

model AuthSession {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  tokenFamilyId  String   @default(dbgenerated("gen_random_uuid()")) @map("token_family_id") @db.Uuid
  deviceName     String?  @map("device_name") @db.VarChar(180)
  ipAddress      String?  @map("ip_address") @db.Inet
  userAgent      String?  @map("user_agent")
  isRevoked      Boolean  @default(false) @map("is_revoked")
  revokedAt      DateTime? @map("revoked_at") @db.Timestamptz(6)
  revokedReason  String?  @map("revoked_reason")
  expiresAt      DateTime @map("expires_at") @db.Timestamptz(6)
  lastUsedAt     DateTime? @map("last_used_at") @db.Timestamptz(6)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokens  AuthRefreshToken[]

  @@index([userId], map: "idx_auth_sessions_user_id")
  @@index([tokenFamilyId], map: "idx_auth_sessions_token_family_id")
  @@index([userId, isRevoked, expiresAt], map: "idx_auth_sessions_active")
  @@map("auth_sessions")
}

model AuthRefreshToken {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId         String   @map("session_id") @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  tokenFamilyId     String   @map("token_family_id") @db.Uuid
  tokenHash         String   @unique @map("token_hash")
  replacedByTokenId String?  @map("replaced_by_token_id") @db.Uuid
  issuedAt          DateTime @default(now()) @map("issued_at") @db.Timestamptz(6)
  expiresAt         DateTime @map("expires_at") @db.Timestamptz(6)
  usedAt            DateTime? @map("used_at") @db.Timestamptz(6)
  revokedAt         DateTime? @map("revoked_at") @db.Timestamptz(6)
  revokedReason     String?  @map("revoked_reason")
  reuseDetectedAt   DateTime? @map("reuse_detected_at") @db.Timestamptz(6)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  session           AuthSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  replacedByToken   AuthRefreshToken? @relation("TokenReplacement", fields: [replacedByTokenId], references: [id], onDelete: SetNull)
  replacesTokens    AuthRefreshToken[] @relation("TokenReplacement")

  @@index([sessionId], map: "idx_auth_refresh_tokens_session_id")
  @@index([userId], map: "idx_auth_refresh_tokens_user_id")
  @@index([tokenFamilyId], map: "idx_auth_refresh_tokens_token_family_id")
  @@index([sessionId, expiresAt, revokedAt], map: "idx_auth_refresh_tokens_active")
  @@map("auth_refresh_tokens")
}

model EmailVerificationToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  usedAt    DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_email_verification_tokens_user_id")
  @@index([userId, expiresAt, usedAt], map: "idx_email_verification_tokens_active")
  @@map("email_verification_tokens")
}

model PasswordResetToken {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  usedAt    DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_password_reset_tokens_user_id")
  @@index([userId, expiresAt, usedAt], map: "idx_password_reset_tokens_active")
  @@map("password_reset_tokens")
}

model LoginAttempt {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String?  @map("user_id") @db.Uuid
  email         String?  @db.Citext
  ipAddress     String?  @map("ip_address") @db.Inet
  userAgent     String?  @map("user_agent")
  success       Boolean  @default(false)
  failureReason String?  @map("failure_reason") @db.VarChar(160)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([email, createdAt], map: "idx_login_attempts_email_created_at")
  @@index([ipAddress, createdAt], map: "idx_login_attempts_ip_created_at")
  @@index([userId, createdAt], map: "idx_login_attempts_user_created_at")
  @@map("login_attempts")
}

model Permission {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key             String           @unique
  description     String?
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)

  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  role         UserRole
  permissionId String     @map("permission_id") @db.Uuid
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)

  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId], map: "uq_role_permission")
  @@index([role], map: "idx_role_permissions_role")
  @@map("role_permissions")
}

model AuditLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actorUserId   String?  @map("actor_user_id") @db.Uuid
  targetUserId  String?  @map("target_user_id") @db.Uuid
  action        String
  entityType    String?  @map("entity_type")
  entityId      String?  @map("entity_id") @db.Uuid
  ipAddress     String?  @map("ip_address") @db.Inet
  userAgent     String?  @map("user_agent")
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  actor         User?    @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)
  target        User?    @relation("AuditTarget", fields: [targetUserId], references: [id], onDelete: SetNull)

  @@index([actorUserId, createdAt], map: "idx_audit_logs_actor_created_at")
  @@index([targetUserId, createdAt], map: "idx_audit_logs_target_created_at")
  @@index([action, createdAt], map: "idx_audit_logs_action_created_at")
  @@index([entityType, entityId], map: "idx_audit_logs_entity")
  @@map("audit_logs")
}

// -----------------------------
// Resume + AI Analysis
// -----------------------------

model Resume {
  id             String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String                 @map("user_id") @db.Uuid
  storageBucket  String                 @default("resumes") @map("storage_bucket")
  storagePath    String                 @unique @map("storage_path")
  originalFileName String               @map("original_file_name")
  mimeType       String?                @map("mime_type")
  sizeBytes      BigInt?                @map("size_bytes")
  checksumSha256 String?                @map("checksum_sha256")

  extractedText  String?                @map("extracted_text")
  embedding      Unsupported("vector")?

  analysisStatus ResumeAnalysisStatus   @default(PENDING) @map("analysis_status")
  analysisJson   Json?                  @map("analysis_json")
  analysisError  String?                @map("analysis_error")
  analyzedAt     DateTime?              @map("analyzed_at") @db.Timestamptz(6)

  isPrimary      Boolean                @default(false) @map("is_primary")
  garbagedAt     DateTime?              @map("garbaged_at") @db.Timestamptz(6)
  garbageReason  String?                @map("garbage_reason")

  legacyImported Boolean                @default(false) @map("legacy_imported")
  legacySourceId String?                @map("legacy_source_id")

  createdAt      DateTime               @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime               @updatedAt @map("updated_at") @db.Timestamptz(6)

  user           User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  resumeAnalysis ResumeAnalysis?
  applications   JobApplication[]

  @@index([userId], map: "idx_resumes_user_id")
  @@index([analysisStatus], map: "idx_resumes_analysis_status")
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
  status          ResumeAnalysisStatus @default(PENDING)
  processedAt     DateTime? @map("processed_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  resume          Resume    @relation(fields: [resumeId], references: [id], onDelete: Cascade)

  @@map("resume_analyses")
}

// -----------------------------
// Jobs + Applications + ATS
// -----------------------------

model Job {
  id              String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  recruiterUserId String     @map("recruiter_user_id") @db.Uuid
  title           String
  description     String
  companyName     String     @map("company_name")
  location        String?
  workMode        String?    @default("hybrid") @map("work_mode")
  employmentType  String?    @default("full_time") @map("employment_type")
  salaryMin       Int?       @map("salary_min")
  salaryMax       Int?       @map("salary_max")
  salaryCurrency  String?    @default("INR") @map("salary_currency")
  requiredSkills  String[]   @default([]) @map("required_skills")
  experienceMin   Float?     @default(0) @map("experience_min")
  experienceMax   Float?     @map("experience_max")
  industry        String?
  status          JobStatus  @default(DRAFT)
  applicantCount  Int        @default(0) @map("applicant_count")

  source          String     @default("internal") @db.VarChar(30)
  externalId      String?    @unique @map("external_id")
  applyUrl        String?    @map("apply_url")
  expiresAt       DateTime?  @map("expires_at") @db.Timestamptz(6)
  syncBatch       String?    @map("sync_batch") @db.VarChar(80)

  legacyImported  Boolean    @default(false) @map("legacy_imported")
  legacySourceId  String?    @map("legacy_source_id")

  publishedAt     DateTime?  @map("published_at") @db.Timestamptz(6)
  closedAt        DateTime?  @map("closed_at") @db.Timestamptz(6)
  createdAt       DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  recruiter       User       @relation("RecruiterJobs", fields: [recruiterUserId], references: [id], onDelete: Cascade)
  applications    JobApplication[]
  interviews      Interview[]

  @@index([recruiterUserId], map: "idx_jobs_recruiter_user_id")
  @@index([status, createdAt], map: "idx_jobs_status_created_at")
  @@index([source], map: "idx_jobs_source")
  @@index([expiresAt], map: "idx_jobs_expires_at")
  @@index([requiredSkills], map: "idx_jobs_required_skills", type: Gin)
  @@map("jobs")
}

model JobApplication {
  id                  String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  jobId               String            @map("job_id") @db.Uuid
  candidateUserId      String            @map("candidate_user_id") @db.Uuid
  resumeId             String?           @map("resume_id") @db.Uuid
  status              ApplicationStatus @default(APPLIED)
  matchScore           Float?            @map("match_score")
  coverLetter          String?           @map("cover_letter")
  recruiterNotes       String?           @map("recruiter_notes")
  appliedAt            DateTime          @default(now()) @map("applied_at") @db.Timestamptz(6)
  lastStatusChangedAt  DateTime?         @map("last_status_changed_at") @db.Timestamptz(6)
  legacyImported       Boolean           @default(false) @map("legacy_imported")
  legacySourceId       String?           @map("legacy_source_id")
  createdAt            DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)

  job                 Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  candidate           User              @relation("CandidateApplications", fields: [candidateUserId], references: [id], onDelete: Cascade)
  resume              Resume?           @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  statusEvents        CandidateStatusEvent[]
  interviews          Interview[]

  @@unique([jobId, candidateUserId], map: "uq_job_applications_job_candidate")
  @@index([candidateUserId], map: "idx_job_applications_candidate_user_id")
  @@index([jobId], map: "idx_job_applications_job_id")
  @@index([status], map: "idx_job_applications_status")
  @@map("job_applications")
}

model CandidateStatusEvent {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId   String            @map("application_id") @db.Uuid
  fromStatus      ApplicationStatus? @map("from_status")
  toStatus        ApplicationStatus  @map("to_status")
  changedByUserId String?           @map("changed_by_user_id") @db.Uuid
  reason          String?
  metadata        Json              @default("{}")
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)

  application     JobApplication    @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  changedBy       User?             @relation("StatusChangedBy", fields: [changedByUserId], references: [id], onDelete: SetNull)

  @@index([applicationId], map: "idx_candidate_status_events_application_id")
  @@index([changedByUserId], map: "idx_candidate_status_events_changed_by")
  @@map("candidate_status_events")
}

// -----------------------------
// Interviews: Mock + Live + Recruiter rounds
// -----------------------------

model Interview {
  id                String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId     String?         @map("application_id") @db.Uuid
  jobId             String?         @map("job_id") @db.Uuid
  candidateUserId    String          @map("candidate_user_id") @db.Uuid
  recruiterUserId    String?         @map("recruiter_user_id") @db.Uuid
  createdByUserId    String?         @map("created_by_user_id") @db.Uuid

  type              InterviewType
  status            InterviewStatus @default(SCHEDULED)
  title             String?
  jobTitle          String?         @map("job_title")
  companyName       String?         @map("company_name")
  scheduledStartAt  DateTime?       @map("scheduled_start_at") @db.Timestamptz(6)
  scheduledEndAt    DateTime?       @map("scheduled_end_at") @db.Timestamptz(6)
  completedAt       DateTime?       @map("completed_at") @db.Timestamptz(6)

  overallScore      Float?          @map("overall_score")
  aiFeedbackJson    Json?           @map("ai_feedback_json")
  metadata          Json            @default("{}")

  createdAt         DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)

  application       JobApplication? @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  job               Job?            @relation(fields: [jobId], references: [id], onDelete: SetNull)
  candidate         User            @relation("InterviewCandidate", fields: [candidateUserId], references: [id], onDelete: Cascade)
  recruiter         User?           @relation("InterviewRecruiter", fields: [recruiterUserId], references: [id], onDelete: SetNull)
  createdBy         User?           @relation("InterviewCreator", fields: [createdByUserId], references: [id], onDelete: SetNull)

  questions         InterviewQuestion[]
  rounds            RecruiterInterviewRound[]
  rooms             InterviewRoom[]
  transcripts       InterviewTranscript[]
  scorecards        InterviewScorecard[]
  chatMessages      InterviewChatMessage[]
  eventLogs         InterviewEventLog[]
  recordings        InterviewRecording[]
  aiAssessments     InterviewAiAssessment[]
  mockAnswers       MockInterviewAnswer[]

  @@index([candidateUserId], map: "idx_interviews_candidate_user_id")
  @@index([recruiterUserId], map: "idx_interviews_recruiter_user_id")
  @@index([applicationId], map: "idx_interviews_application_id")
  @@index([status, scheduledStartAt], map: "idx_interviews_status_start")
  @@map("interviews")
}

model InterviewQuestion {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId     String    @map("interview_id") @db.Uuid
  questionNumber  Int       @map("question_number")
  question        String
  category        String?
  difficulty      String    @default("medium")
  idealAnswer     String?   @map("ideal_answer")
  userAnswer      String?   @map("user_answer")
  score           Float?
  feedback        String?
  timeTakenSecs   Int?      @map("time_taken_secs")
  answeredAt      DateTime? @map("answered_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  interview       Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@unique([interviewId, questionNumber], map: "uq_interview_question_number")
  @@index([interviewId], map: "idx_interview_questions_interview_id")
  @@map("interview_questions")
}

model RecruiterInterviewRound {
  id              String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId     String               @map("interview_id") @db.Uuid
  roundNumber     Int                  @map("round_number")
  roundType       String               @map("round_type")
  scheduledAt     DateTime?            @map("scheduled_at") @db.Timestamptz(6)
  durationMins    Int                  @default(45) @map("duration_mins")
  mode            String               @default("video")
  interviewerId   String?              @map("interviewer_id") @db.Uuid
  meetingProvider String               @default("internal") @map("meeting_provider")
  meetingRoomId   String?              @map("meeting_room_id") @db.Uuid
  meetingJoinUrl  String?              @map("meeting_join_url")
  result          InterviewRoundResult @default(PENDING)
  score           Float?
  feedback        String?
  notify30Sent    Boolean              @default(false) @map("notify_30_sent")
  notify15Sent    Boolean              @default(false) @map("notify_15_sent")
  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)

  interview       Interview            @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  meetingRoom     InterviewRoom?       @relation(fields: [meetingRoomId], references: [id], onDelete: SetNull)
  notes           RecruiterInterviewNote[]

  @@unique([interviewId, roundNumber], map: "uq_recruiter_round_interview_number")
  @@index([scheduledAt], map: "idx_recruiter_rounds_scheduled")
  @@index([interviewId], map: "idx_recruiter_rounds_interview")
  @@map("recruiter_interview_rounds")
}

model InterviewRoom {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId      String?   @map("interview_id") @db.Uuid
  roomName         String?   @map("room_name")
  provider         String    @default("internal")
  providerRoomId   String?   @map("provider_room_id")
  maxParticipants  Int       @default(4) @map("max_participants")
  mode             String    @default("video")
  isLocked         Boolean   @default(false) @map("is_locked")
  hostUserId       String?   @map("host_user_id") @db.Uuid
  joinUrl          String?   @map("join_url")
  startedAt        DateTime? @map("started_at") @db.Timestamptz(6)
  endedAt          DateTime? @map("ended_at") @db.Timestamptz(6)
  metadata         Json      @default("{}")
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  interview        Interview? @relation(fields: [interviewId], references: [id], onDelete: SetNull)
  host             User?      @relation("RoomHost", fields: [hostUserId], references: [id], onDelete: SetNull)
  participants     RoomParticipant[]
  recruiterRounds  RecruiterInterviewRound[]
  transcripts      InterviewTranscript[]
  chatMessages     InterviewChatMessage[]
  eventLogs        InterviewEventLog[]
  recordings       InterviewRecording[]

  @@index([hostUserId], map: "idx_interview_rooms_host")
  @@index([interviewId], map: "idx_interview_rooms_interview")
  @@map("interview_rooms")
}

model RoomParticipant {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  roomId        String    @map("room_id") @db.Uuid
  userId        String    @map("user_id") @db.Uuid
  role          String    @default("participant")
  displayName   String?   @map("display_name")
  joinedAt      DateTime  @default(now()) @map("joined_at") @db.Timestamptz(6)
  leftAt        DateTime? @map("left_at") @db.Timestamptz(6)
  isMuted       Boolean   @default(false) @map("is_muted")
  isVideoOff    Boolean   @default(false) @map("is_video_off")
  raisedHand    Boolean   @default(false) @map("raised_hand")
  rtcClientId   String?   @map("rtc_client_id")
  metadata      Json      @default("{}")

  room          InterviewRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  mediaState    MediaState?
  transcripts   InterviewTranscript[]

  @@index([roomId], map: "idx_room_participants_room")
  @@index([userId], map: "idx_room_participants_user")
  @@map("room_participants")
}

model MediaState {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  participantId  String   @unique @map("participant_id") @db.Uuid
  audioEnabled   Boolean  @default(true) @map("audio_enabled")
  videoEnabled   Boolean  @default(true) @map("video_enabled")
  screenSharing  Boolean  @default(false) @map("screen_sharing")
  lastUpdated    DateTime @updatedAt @map("last_updated") @db.Timestamptz(6)
  bandwidthKbps  Int?     @map("bandwidth_kbps")
  resolution     String?
  metadata       Json     @default("{}")

  participant    RoomParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@index([participantId], map: "idx_media_states_participant")
  @@map("media_states")
}

model InterviewTranscript {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId   String?   @map("interview_id") @db.Uuid
  roomId        String?   @map("room_id") @db.Uuid
  participantId String?   @map("participant_id") @db.Uuid
  content       String
  timestamp     DateTime  @default(now()) @db.Timestamptz(6)
  source        String    @default("local")
  confidence    Float?
  isFinal       Boolean   @default(false) @map("is_final")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  interview     Interview?       @relation(fields: [interviewId], references: [id], onDelete: SetNull)
  room          InterviewRoom?   @relation(fields: [roomId], references: [id], onDelete: SetNull)
  participant   RoomParticipant? @relation(fields: [participantId], references: [id], onDelete: SetNull)

  @@index([interviewId], map: "idx_transcripts_interview")
  @@index([roomId], map: "idx_transcripts_room")
  @@map("interview_transcripts")
}

model InterviewScorecard {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId     String   @map("interview_id") @db.Uuid
  createdByUserId String   @map("created_by_user_id") @db.Uuid
  rubric          Json     @default("{}")
  totalScore      Float?   @map("total_score")
  comments        String?
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  interview       Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  createdBy       User      @relation("ScorecardCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)

  @@index([interviewId], map: "idx_scorecards_interview")
  @@map("interview_scorecards")
}

model InterviewChatMessage {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  roomId       String   @map("room_id") @db.Uuid
  interviewId  String?  @map("interview_id") @db.Uuid
  senderId     String   @map("sender_id") @db.Uuid
  message      String
  messageType  String   @default("text") @map("message_type")
  fileUrl      String?  @map("file_url")
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  room         InterviewRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  interview    Interview?    @relation(fields: [interviewId], references: [id], onDelete: SetNull)
  sender       User          @relation("ChatSender", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([roomId], map: "idx_chat_room")
  @@index([interviewId], map: "idx_chat_interview")
  @@map("interview_chat_messages")
}

model InterviewEventLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId   String?  @map("interview_id") @db.Uuid
  roomId        String?  @map("room_id") @db.Uuid
  actorUserId   String?  @map("actor_user_id") @db.Uuid
  eventType     String   @map("event_type")
  payload       Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  interview     Interview?     @relation(fields: [interviewId], references: [id], onDelete: SetNull)
  room          InterviewRoom? @relation(fields: [roomId], references: [id], onDelete: SetNull)
  actor         User?          @relation("InterviewEventActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([interviewId], map: "idx_events_interview")
  @@index([roomId], map: "idx_events_room")
  @@map("interview_events_log")
}

model InterviewRecording {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId          String   @map("interview_id") @db.Uuid
  roomId               String?  @map("room_id") @db.Uuid
  storagePath          String   @map("storage_path")
  durationSecs         Int?     @map("duration_secs")
  fileSizeBytes        BigInt?  @map("file_size_bytes")
  status               String   @default("processing")
  transcriptionStatus  String   @default("pending") @map("transcription_status")
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  interview            Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)
  room                 InterviewRoom? @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([interviewId], map: "idx_recordings_interview")
  @@index([roomId], map: "idx_recordings_room")
  @@map("interview_recordings")
}

model InterviewAiAssessment {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId            String   @map("interview_id") @db.Uuid
  overallScore           Float    @map("overall_score")
  technicalScore         Float?   @map("technical_score")
  communicationScore     Float?   @map("communication_score")
  problemSolvingScore    Float?   @map("problem_solving_score")
  strengths              String[] @default([])
  weaknesses             String[] @default([])
  recommendations        String[] @default([])
  assessmentJson         Json     @default("{}") @map("assessment_json")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  interview              Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@index([interviewId], map: "idx_ai_assessments_interview")
  @@map("interview_ai_assessments")
}

model RecruiterInterviewNote {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewRoundId   String   @map("interview_round_id") @db.Uuid
  recruiterId        String   @map("recruiter_id") @db.Uuid
  noteText           String   @map("note_text")
  aiGenerated        Boolean  @default(false) @map("ai_generated")
  confidenceScore    Float?   @map("confidence_score")
  timestamp          DateTime @default(now()) @db.Timestamptz(6)

  round              RecruiterInterviewRound @relation(fields: [interviewRoundId], references: [id], onDelete: Cascade)
  recruiter          User @relation("RecruiterNoteAuthor", fields: [recruiterId], references: [id], onDelete: Cascade)

  @@index([interviewRoundId], map: "idx_recruiter_notes_round")
  @@index([recruiterId], map: "idx_recruiter_notes_recruiter")
  @@map("recruiter_interview_notes")
}

model MockInterviewAnswer {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  interviewId     String   @map("interview_id") @db.Uuid
  questionNumber  Int      @map("question_number")
  question        String
  userAnswer      String   @map("user_answer")
  aiFeedback      String?  @map("ai_feedback")
  answerScore     Float?   @map("answer_score")
  submittedAt     DateTime @default(now()) @map("submitted_at") @db.Timestamptz(6)

  interview       Interview @relation(fields: [interviewId], references: [id], onDelete: Cascade)

  @@unique([interviewId, questionNumber], map: "uq_mock_answer_question")
  @@index([interviewId], map: "idx_mock_answers_interview")
  @@map("mock_interview_answers")
}

// -----------------------------
// Notifications
// -----------------------------

model Notification {
  id        String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String              @map("user_id") @db.Uuid
  type      NotificationType
  channel   NotificationChannel @default(IN_APP)
  title     String              @db.VarChar(220)
  body      String?
  readAt    DateTime?           @map("read_at") @db.Timestamptz(6)
  sentAt    DateTime?           @map("sent_at") @db.Timestamptz(6)
  metadata  Json                @default("{}")
  createdAt DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)

  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt], map: "idx_notifications_user_created_at")
  @@index([userId, readAt], map: "idx_notifications_user_read")
  @@map("notifications")
}

```
```
-- ============================================================
-- JobCrawler Fresh Supabase PostgreSQL Setup
-- Generated from schema_new_jobcrawler.prisma
-- IMPORTANT: Run only on NEW clean Supabase DB. Do NOT run on old exposed DB.
-- ============================================================

-- ----------------------------
-- Extensions
-- ----------------------------
create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "vector";

-- ----------------------------
-- Helper trigger functions
-- ----------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.set_last_updated()
returns trigger as $$
begin
  new.last_updated = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------
-- Enums
-- ----------------------------
do $$ begin
  create type public.user_role as enum ('JOBSEEKER', 'RECRUITER', 'ADMIN', 'SUPER_ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.auth_provider as enum ('CREDENTIALS', 'GOOGLE', 'GITHUB');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.resume_analysis_status as enum ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.application_status as enum (
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
    'WITHDRAWN'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.interview_type as enum ('AI_MOCK', 'RECRUITER_LIVE', 'TECHNICAL', 'HR', 'FINAL');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.interview_status as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.interview_round_result as enum ('PENDING', 'PASSED', 'FAILED', 'CANCELLED', 'NO_SHOW');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum ('AUTH', 'APPLICATION', 'INTERVIEW', 'JOB', 'RESUME', 'ADMIN', 'SYSTEM');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('IN_APP', 'EMAIL');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Identity + Auth Foundation
-- ============================================================

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text,
  full_name varchar(160),
  avatar_url text,
  role public.user_role not null default 'JOBSEEKER',
  email_verified boolean not null default false,
  email_verified_at timestamptz,
  password_changed_at timestamptz,
  is_active boolean not null default true,
  is_blocked boolean not null default false,
  blocked_reason text,
  deactivated_at timestamptz,
  deleted_at timestamptz,
  legacy_imported boolean not null default false,
  legacy_source_id text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_email_verified on public.users(email_verified);
create index if not exists idx_users_active_blocked on public.users(is_active, is_blocked);
create index if not exists idx_users_created_at on public.users(created_at);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  phone varchar(30),
  location varchar(180),
  bio text,
  website_url text,
  linkedin_url text,
  github_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create table if not exists public.jobseeker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  headline varchar(220),
  bio text,
  photo_url text,
  location text,
  phone text,
  current_education text,
  availability text not null default 'immediate',
  target_roles text[] not null default '{}',
  target_industries text[] not null default '{}',
  employment_types text[] not null default '{}',
  work_mode text,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'INR',
  salary_negotiable boolean not null default true,
  willing_to_relocate boolean not null default false,
  preferred_locations text[] not null default '{}',
  current_title text,
  current_company text,
  experience_years double precision,
  experience_level text,
  top_skills text[] not null default '{}',
  active_resume_id uuid,
  open_to_work boolean not null default true,
  is_visible boolean not null default true,
  profile_completion integer not null default 0,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobseeker_profiles_open_to_work on public.jobseeker_profiles(open_to_work);
create index if not exists idx_jobseeker_profiles_visible on public.jobseeker_profiles(is_visible);

drop trigger if exists trg_jobseeker_profiles_updated_at on public.jobseeker_profiles;
create trigger trg_jobseeker_profiles_updated_at
before update on public.jobseeker_profiles
for each row execute function public.set_updated_at();

create table if not exists public.recruiter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  title text,
  photo_url text,
  phone text,
  linkedin_url text,
  is_verified boolean not null default false,
  verified_recruiter boolean not null default false,
  company_name text,
  company_size text,
  company_industry text[] not null default '{}',
  company_website text,
  company_logo_url text,
  company_description text,
  company_location text,
  hiring_roles text[] not null default '{}',
  typical_stack text[] not null default '{}',
  hiring_volume text,
  open_to_remote boolean not null default true,
  subscription_tier text not null default 'free',
  monthly_view_limit integer not null default 50,
  views_used_this_month integer not null default 0,
  profile_completion integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recruiter_profiles_verified on public.recruiter_profiles(verified_recruiter);

drop trigger if exists trg_recruiter_profiles_updated_at on public.recruiter_profiles;
create trigger trg_recruiter_profiles_updated_at
before update on public.recruiter_profiles
for each row execute function public.set_updated_at();

create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider public.auth_provider not null,
  provider_account_id text,
  provider_email citext,
  provider_email_verified boolean not null default false,
  linked_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'uq_auth_accounts_provider_account') then
    alter table public.auth_accounts
      add constraint uq_auth_accounts_provider_account unique (provider, provider_account_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'uq_auth_accounts_user_provider') then
    alter table public.auth_accounts
      add constraint uq_auth_accounts_user_provider unique (user_id, provider);
  end if;
end $$;

create index if not exists idx_auth_accounts_user_id on public.auth_accounts(user_id);
create index if not exists idx_auth_accounts_provider_email on public.auth_accounts(provider_email);

drop trigger if exists trg_auth_accounts_updated_at on public.auth_accounts;
create trigger trg_auth_accounts_updated_at
before update on public.auth_accounts
for each row execute function public.set_updated_at();

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_family_id uuid not null default gen_random_uuid(),
  device_name varchar(180),
  ip_address inet,
  user_agent text,
  is_revoked boolean not null default false,
  revoked_at timestamptz,
  revoked_reason text,
  expires_at timestamptz not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id on public.auth_sessions(user_id);
create index if not exists idx_auth_sessions_token_family_id on public.auth_sessions(token_family_id);
create index if not exists idx_auth_sessions_active on public.auth_sessions(user_id, is_revoked, expires_at);

drop trigger if exists trg_auth_sessions_updated_at on public.auth_sessions;
create trigger trg_auth_sessions_updated_at
before update on public.auth_sessions
for each row execute function public.set_updated_at();

create table if not exists public.auth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.auth_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  token_family_id uuid not null,
  token_hash text not null unique,
  replaced_by_token_id uuid references public.auth_refresh_tokens(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  reuse_detected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_refresh_tokens_session_id on public.auth_refresh_tokens(session_id);
create index if not exists idx_auth_refresh_tokens_user_id on public.auth_refresh_tokens(user_id);
create index if not exists idx_auth_refresh_tokens_token_family_id on public.auth_refresh_tokens(token_family_id);
create index if not exists idx_auth_refresh_tokens_active on public.auth_refresh_tokens(session_id, expires_at, revoked_at);

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_verification_tokens_user_id on public.email_verification_tokens(user_id);
create index if not exists idx_email_verification_tokens_active on public.email_verification_tokens(user_id, expires_at, used_at);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_active on public.password_reset_tokens(user_id, expires_at, used_at);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  email citext,
  ip_address inet,
  user_agent text,
  success boolean not null default false,
  failure_reason varchar(160),
  created_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_email_created_at on public.login_attempts(email, created_at);
create index if not exists idx_login_attempts_ip_created_at on public.login_attempts(ip_address, created_at);
create index if not exists idx_login_attempts_user_created_at on public.login_attempts(user_id, created_at);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_role_permission unique(role, permission_id)
);

create index if not exists idx_role_permissions_role on public.role_permissions(role);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor_created_at on public.audit_logs(actor_user_id, created_at);
create index if not exists idx_audit_logs_target_created_at on public.audit_logs(target_user_id, created_at);
create index if not exists idx_audit_logs_action_created_at on public.audit_logs(action, created_at);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ============================================================
-- Resume + AI Analysis
-- ============================================================

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  storage_bucket text not null default 'resumes',
  storage_path text not null unique,
  original_file_name text not null,
  mime_type text,
  size_bytes bigint,
  checksum_sha256 text,
  extracted_text text,
  embedding vector,
  analysis_status public.resume_analysis_status not null default 'PENDING',
  analysis_json jsonb,
  analysis_error text,
  analyzed_at timestamptz,
  is_primary boolean not null default false,
  garbaged_at timestamptz,
  garbage_reason text,
  legacy_imported boolean not null default false,
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_resumes_analysis_status on public.resumes(analysis_status);
create index if not exists idx_resumes_garbaged_at on public.resumes(garbaged_at);

drop trigger if exists trg_resumes_updated_at on public.resumes;
create trigger trg_resumes_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

-- active_resume_id FK added after resumes table exists
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_jobseeker_profiles_active_resume') then
    alter table public.jobseeker_profiles
      add constraint fk_jobseeker_profiles_active_resume
      foreign key (active_resume_id) references public.resumes(id) on delete set null;
  end if;
end $$;

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null unique references public.resumes(id) on delete cascade,
  raw_text text not null,
  personal_info jsonb not null default '{}'::jsonb,
  work_experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  experience_years double precision not null default 0,
  experience_level text not null default 'junior',
  top_skills text[] not null default '{}',
  industry_tags text[] not null default '{}',
  trajectory text,
  status public.resume_analysis_status not null default 'PENDING',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Jobs + Applications + ATS
-- ============================================================

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  company_name text not null,
  location text,
  work_mode text default 'hybrid',
  employment_type text default 'full_time',
  salary_min integer,
  salary_max integer,
  salary_currency text default 'INR',
  required_skills text[] not null default '{}',
  experience_min double precision default 0,
  experience_max double precision,
  industry text,
  status public.job_status not null default 'DRAFT',
  applicant_count integer not null default 0,
  source varchar(30) not null default 'internal',
  external_id text unique,
  apply_url text,
  expires_at timestamptz,
  sync_batch varchar(80),
  legacy_imported boolean not null default false,
  legacy_source_id text,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_recruiter_user_id on public.jobs(recruiter_user_id);
create index if not exists idx_jobs_status_created_at on public.jobs(status, created_at);
create index if not exists idx_jobs_source on public.jobs(source);
create index if not exists idx_jobs_expires_at on public.jobs(expires_at);
create index if not exists idx_jobs_required_skills on public.jobs using gin(required_skills);

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_user_id uuid not null references public.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  status public.application_status not null default 'APPLIED',
  match_score double precision,
  cover_letter text,
  recruiter_notes text,
  applied_at timestamptz not null default now(),
  last_status_changed_at timestamptz,
  legacy_imported boolean not null default false,
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_job_applications_job_candidate unique(job_id, candidate_user_id)
);

create index if not exists idx_job_applications_candidate_user_id on public.job_applications(candidate_user_id);
create index if not exists idx_job_applications_job_id on public.job_applications(job_id);
create index if not exists idx_job_applications_status on public.job_applications(status);

drop trigger if exists trg_job_applications_updated_at on public.job_applications;
create trigger trg_job_applications_updated_at
before update on public.job_applications
for each row execute function public.set_updated_at();

create table if not exists public.candidate_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by_user_id uuid references public.users(id) on delete set null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidate_status_events_application_id on public.candidate_status_events(application_id);
create index if not exists idx_candidate_status_events_changed_by on public.candidate_status_events(changed_by_user_id);

-- ============================================================
-- Interviews: Mock + Live + Recruiter Rounds
-- ============================================================

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.job_applications(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  candidate_user_id uuid not null references public.users(id) on delete cascade,
  recruiter_user_id uuid references public.users(id) on delete set null,
  created_by_user_id uuid references public.users(id) on delete set null,
  type public.interview_type not null,
  status public.interview_status not null default 'SCHEDULED',
  title text,
  job_title text,
  company_name text,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  completed_at timestamptz,
  overall_score double precision,
  ai_feedback_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interviews_candidate_user_id on public.interviews(candidate_user_id);
create index if not exists idx_interviews_recruiter_user_id on public.interviews(recruiter_user_id);
create index if not exists idx_interviews_application_id on public.interviews(application_id);
create index if not exists idx_interviews_status_start on public.interviews(status, scheduled_start_at);

drop trigger if exists trg_interviews_updated_at on public.interviews;
create trigger trg_interviews_updated_at
before update on public.interviews
for each row execute function public.set_updated_at();

create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_number integer not null,
  question text not null,
  category text,
  difficulty text not null default 'medium',
  ideal_answer text,
  user_answer text,
  score double precision,
  feedback text,
  time_taken_secs integer,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint uq_interview_question_number unique(interview_id, question_number)
);

create index if not exists idx_interview_questions_interview_id on public.interview_questions(interview_id);

create table if not exists public.interview_rooms (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete set null,
  room_name text,
  provider text not null default 'internal',
  provider_room_id text,
  max_participants integer not null default 4,
  mode text not null default 'video',
  is_locked boolean not null default false,
  host_user_id uuid references public.users(id) on delete set null,
  join_url text,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_rooms_host on public.interview_rooms(host_user_id);
create index if not exists idx_interview_rooms_interview on public.interview_rooms(interview_id);

create table if not exists public.recruiter_interview_rounds (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  round_number integer not null,
  round_type text not null,
  scheduled_at timestamptz,
  duration_mins integer not null default 45,
  mode text not null default 'video',
  interviewer_id uuid,
  meeting_provider text not null default 'internal',
  meeting_room_id uuid references public.interview_rooms(id) on delete set null,
  meeting_join_url text,
  result public.interview_round_result not null default 'PENDING',
  score double precision,
  feedback text,
  notify_30_sent boolean not null default false,
  notify_15_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_recruiter_round_interview_number unique(interview_id, round_number)
);

create index if not exists idx_recruiter_rounds_scheduled on public.recruiter_interview_rounds(scheduled_at);
create index if not exists idx_recruiter_rounds_interview on public.recruiter_interview_rounds(interview_id);

drop trigger if exists trg_recruiter_interview_rounds_updated_at on public.recruiter_interview_rounds;
create trigger trg_recruiter_interview_rounds_updated_at
before update on public.recruiter_interview_rounds
for each row execute function public.set_updated_at();

create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.interview_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'participant',
  display_name text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  is_muted boolean not null default false,
  is_video_off boolean not null default false,
  raised_hand boolean not null default false,
  rtc_client_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_room_participants_room on public.room_participants(room_id);
create index if not exists idx_room_participants_user on public.room_participants(user_id);

create table if not exists public.media_states (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.room_participants(id) on delete cascade,
  audio_enabled boolean not null default true,
  video_enabled boolean not null default true,
  screen_sharing boolean not null default false,
  last_updated timestamptz not null default now(),
  bandwidth_kbps integer,
  resolution text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_media_states_participant on public.media_states(participant_id);

drop trigger if exists trg_media_states_last_updated on public.media_states;
create trigger trg_media_states_last_updated
before update on public.media_states
for each row execute function public.set_last_updated();

create table if not exists public.interview_transcripts (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete set null,
  room_id uuid references public.interview_rooms(id) on delete set null,
  participant_id uuid references public.room_participants(id) on delete set null,
  content text not null,
  timestamp timestamptz not null default now(),
  source text not null default 'local',
  confidence double precision,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_transcripts_interview on public.interview_transcripts(interview_id);
create index if not exists idx_transcripts_room on public.interview_transcripts(room_id);

create table if not exists public.interview_scorecards (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete cascade,
  rubric jsonb not null default '{}'::jsonb,
  total_score double precision,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scorecards_interview on public.interview_scorecards(interview_id);

drop trigger if exists trg_interview_scorecards_updated_at on public.interview_scorecards;
create trigger trg_interview_scorecards_updated_at
before update on public.interview_scorecards
for each row execute function public.set_updated_at();

create table if not exists public.interview_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.interview_rooms(id) on delete cascade,
  interview_id uuid references public.interviews(id) on delete set null,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  message_type text not null default 'text',
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_room on public.interview_chat_messages(room_id);
create index if not exists idx_chat_interview on public.interview_chat_messages(interview_id);

create table if not exists public.interview_events_log (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete set null,
  room_id uuid references public.interview_rooms(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_interview on public.interview_events_log(interview_id);
create index if not exists idx_events_room on public.interview_events_log(room_id);

create table if not exists public.interview_recordings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  room_id uuid references public.interview_rooms(id) on delete set null,
  storage_path text not null,
  duration_secs integer,
  file_size_bytes bigint,
  status text not null default 'processing',
  transcription_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_recordings_interview on public.interview_recordings(interview_id);
create index if not exists idx_recordings_room on public.interview_recordings(room_id);

create table if not exists public.interview_ai_assessments (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  overall_score double precision not null,
  technical_score double precision,
  communication_score double precision,
  problem_solving_score double precision,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  recommendations text[] not null default '{}',
  assessment_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_assessments_interview on public.interview_ai_assessments(interview_id);

create table if not exists public.recruiter_interview_notes (
  id uuid primary key default gen_random_uuid(),
  interview_round_id uuid not null references public.recruiter_interview_rounds(id) on delete cascade,
  recruiter_id uuid not null references public.users(id) on delete cascade,
  note_text text not null,
  ai_generated boolean not null default false,
  confidence_score double precision,
  timestamp timestamptz not null default now()
);

create index if not exists idx_recruiter_notes_round on public.recruiter_interview_notes(interview_round_id);
create index if not exists idx_recruiter_notes_recruiter on public.recruiter_interview_notes(recruiter_id);

create table if not exists public.mock_interview_answers (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_number integer not null,
  question text not null,
  user_answer text not null,
  ai_feedback text,
  answer_score double precision,
  submitted_at timestamptz not null default now(),
  constraint uq_mock_answer_question unique(interview_id, question_number)
);

create index if not exists idx_mock_answers_interview on public.mock_interview_answers(interview_id);

-- ============================================================
-- Notifications
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  channel public.notification_channel not null default 'IN_APP',
  title varchar(220) not null,
  body text,
  read_at timestamptz,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created_at on public.notifications(user_id, created_at);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);

-- ============================================================
-- Seed permissions
-- ============================================================

insert into public.permissions(key, description) values
  ('jobs:create', 'Create recruiter jobs'),
  ('jobs:update', 'Update recruiter jobs'),
  ('jobs:delete', 'Delete or archive recruiter jobs'),
  ('jobs:read', 'Read jobs'),
  ('applications:create', 'Apply to jobs'),
  ('applications:read', 'Read applications'),
  ('applications:update_status', 'Update candidate application status'),
  ('ats:shortlist', 'Shortlist candidates'),
  ('interviews:create', 'Create or schedule interviews'),
  ('interviews:read', 'Read interviews'),
  ('interviews:update', 'Update interviews'),
  ('resumes:upload', 'Upload resumes'),
  ('resumes:read_own', 'Read own resumes'),
  ('resumes:read_candidates', 'Read candidate resumes for recruiter jobs'),
  ('notifications:read', 'Read own notifications'),
  ('admin:users:read', 'Admin read users'),
  ('admin:users:block', 'Admin block users'),
  ('admin:users:manage_roles', 'Admin manage roles'),
  ('admin:audit_logs:read', 'Admin read audit logs')
on conflict (key) do nothing;

insert into public.role_permissions(role, permission_id)
select 'JOBSEEKER', id from public.permissions
where key in (
  'jobs:read',
  'applications:create',
  'resumes:upload',
  'resumes:read_own',
  'interviews:read',
  'notifications:read'
)
on conflict do nothing;

insert into public.role_permissions(role, permission_id)
select 'RECRUITER', id from public.permissions
where key in (
  'jobs:create',
  'jobs:update',
  'jobs:delete',
  'jobs:read',
  'applications:read',
  'applications:update_status',
  'ats:shortlist',
  'interviews:create',
  'interviews:read',
  'interviews:update',
  'resumes:read_candidates',
  'notifications:read'
)
on conflict do nothing;

insert into public.role_permissions(role, permission_id)
select 'ADMIN', id from public.permissions
where key in (
  'jobs:create',
  'jobs:update',
  'jobs:delete',
  'jobs:read',
  'applications:read',
  'applications:update_status',
  'ats:shortlist',
  'interviews:create',
  'interviews:read',
  'interviews:update',
  'resumes:read_candidates',
  'notifications:read',
  'admin:users:read',
  'admin:users:block',
  'admin:audit_logs:read'
)
on conflict do nothing;

insert into public.role_permissions(role, permission_id)
select 'SUPER_ADMIN', id from public.permissions
on conflict do nothing;

-- ============================================================
-- Supabase Storage Buckets
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'interview-recordings',
  'interview-recordings',
  false,
  1073741824,
  array[
    'video/webm',
    'video/mp4',
    'audio/webm',
    'audio/mpeg'
  ]
)
on conflict (id) do nothing;

-- ============================================================
-- Enable Row Level Security
-- Backend should be auth authority. No public policies by default.
-- This blocks direct browser access via anon/authenticated Supabase client.
-- ============================================================

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.jobseeker_profiles enable row level security;
alter table public.recruiter_profiles enable row level security;
alter table public.auth_accounts enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_refresh_tokens enable row level security;
alter table public.email_verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.login_attempts enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.candidate_status_events enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_rooms enable row level security;
alter table public.recruiter_interview_rounds enable row level security;
alter table public.room_participants enable row level security;
alter table public.media_states enable row level security;
alter table public.interview_transcripts enable row level security;
alter table public.interview_scorecards enable row level security;
alter table public.interview_chat_messages enable row level security;
alter table public.interview_events_log enable row level security;
alter table public.interview_recordings enable row level security;
alter table public.interview_ai_assessments enable row level security;
alter table public.recruiter_interview_notes enable row level security;
alter table public.mock_interview_answers enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- Comments / Safety Notes
-- ============================================================

comment on table public.users is 'Main identity table. Never return password_hash to clients.';
comment on table public.auth_refresh_tokens is 'Stores hashed refresh tokens only. Never store plaintext refresh tokens.';
comment on table public.password_reset_tokens is 'Stores hashed reset tokens only.';
comment on table public.email_verification_tokens is 'Stores hashed email verification tokens only.';
comment on table public.audit_logs is 'Security and business audit logs.';
comment on table public.resumes is 'Resume metadata only. Actual files stay in private Supabase Storage bucket.';

-- ============================================================
-- Done
-- ============================================================

```