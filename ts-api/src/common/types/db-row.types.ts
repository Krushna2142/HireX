/* eslint-disable prettier/prettier */
// src/common/types/db-row.types.ts
//
// Typed interfaces for raw PostgreSQL row shapes returned by DatabaseService.
// These are intentionally separate from domain DTOs — they reflect the exact
// snake_case column names that pg returns, before any mapping to camelCase.
//
// Rule: add a row type here whenever a service uses db.query<T>() and the
// typed row needs to be visible across a module boundary (controller ↔ service).

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserRow {
  id:            string;
  full_name:     string;
  email:         string;
  role:          string;
  password_hash: string;
  created_at:    Date;
}

export interface UserIdRow {
  id: string;
}

export interface UserIdEmailRow {
  id:    string;
  email: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertRow {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  message:    string;
  metadata:   Record<string, unknown>;
  read:       boolean;
  created_at: Date;
}

export interface CountRow {
  count: string;   // pg always returns COUNT() as string
}

export interface CandidateUserIdRow {
  user_id: string;
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export interface JobRow {
  id:           string;
  title:        string;
  recruiter_id: string;
  source:       string;
}

export interface OwnershipRow {
  id:           string;
  candidate_id: string;
  title:        string;
}

export interface ProfileSkillsRow {
  top_skills:       string[];
  experience_level: string;
  current_title:    string;
  industry_tags:    string[];
}

export interface SkillsOnlyRow {
  top_skills: string[];
}

export interface RequiredSkillsRow {
  required_skills: string[];
}

// ── Interviews ────────────────────────────────────────────────────────────────

export interface InterviewQuestionRow {
  id:              string;
  session_id:      string;
  question_number: number;
  question:        string;
  category:        string;
  difficulty:      string;
  ideal_answer:    string;
  user_answer:     string | null;
  score:           number | null;
  feedback:        string | null;
  time_taken_secs: number | null;
  answered_at:     Date | null;
}

export interface InterviewQuestionWithCandidateRow extends InterviewQuestionRow {
  candidate_id: string;
}

export interface AnalysisContextRow {
  experience_level: string;
  experience_years: number;
  skills:           unknown;
  work_experience:  unknown;
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface CandidateProfileRow {
  top_skills:       string[];
  experience_level: string;
  experience_years: number;
  target_roles:     string[];
  work_mode:        string | null;
  salary_min:       number | null;
  salary_max:       number | null;
}

export interface JobRecommendationRow {
  id:              string;
  title:           string;
  company:         string;
  location:        string | null;
  work_mode:       string | null;
  employment_type: string | null;
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string;
  required_skills: string[];
  description:     string;
  created_at:      Date;
  apply_url:       string | null;
  recruiter_name:  string;
  applicant_count: string;
  status:          string;
  // SQL-computed scoring columns (CASE expressions return INTEGER from pg)
  skill_score:  number;
  mode_score:   number;
  salary_score: number;
}

export interface SkillDemandRow {
  skill:         string;
  demand_count:  string;
  candidate_has: boolean;
}