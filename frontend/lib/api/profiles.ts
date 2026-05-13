/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/axios';

// ── Candidate Types ─────────────────────────────────────────────────────────

export interface CandidateProfile {
  full_name: string;
  id: string;
  userId: string;

  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  location: string | null;
  phone: string | null;

  availability: string;

  targetRoles: string[];
  targetIndustries: string[];
  employmentTypes: string[];

  workMode: string | null;

  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryNegotiable: boolean;

  willingToRelocate: boolean;
  preferredLocations: string[];

  currentTitle: string | null;
  currentCompany: string | null;

  experienceYears: number | null;
  experienceLevel: string | null;

  topSkills: string[];

  activeResumeId: string | null;
  isVisible: boolean;

  profileCompletion: number;
  lastActiveAt: string;

  // Enriched
  analysis?: any;
  stats?: {
    total: number;
    applied: number;
    shortlisted: number;
    interview: number;
    offered: number;
    rejected: number;
  };
  recentApplications?: any[];
}

// ── Recruiter Types ─────────────────────────────────────────────────────────

export interface RecruiterPipelineStats {
  totalJobs: number;
  totalApplications: number;
  newApplicants: number;
  shortlisted: number;
  inInterview: number;
  offered: number;
  rejected?: number;
  activeJobs: number;
  offerRate: number;
  avgDaysToHire: number;
}

export interface RecruiterRecentApplicant {
  id: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
  jobTitle?: string | null;
  job_title?: string | null;
  status?: string | null;
  appliedAt?: string | null;
  applied_at?: string | null;
  matchScore?: number | null;
  match_score?: number | null;
}

export interface RecruiterProfile {
  id: string;
  userId: string;

  title: string | null;
  photoUrl: string | null;
  phone: string | null;
  linkedinUrl: string | null;

  isVerified: boolean;

  companyName: string | null;
  companySize: string | null;
  companyIndustry: string[];
  companyWebsite: string | null;
  companyLogoUrl: string | null;
  companyDescription: string | null;
  companyLocation: string | null;

  hiringRoles: string[];
  typicalStack: string[];
  hiringVolume: string | null;
  openToRemote: boolean;

  subscriptionTier: string;
  profileCompletion: number;

  // Enriched
  pipeline?: RecruiterPipelineStats;
  recentApplicants?: RecruiterRecentApplicant[];
}

/**
 * Only fields recruiter can edit from frontend.
 * Do not include id, userId, isVerified, subscriptionTier, profileCompletion,
 * pipeline, or recentApplicants because those are system/backend-controlled.
 */
export type RecruiterProfileUpdateDto = Partial<{
  title: string | null;
  photoUrl: string | null;
  phone: string | null;
  linkedinUrl: string | null;

  companyName: string | null;
  companySize: string | null;
  companyIndustry: string[];
  companyWebsite: string | null;
  companyLogoUrl: string | null;
  companyDescription: string | null;
  companyLocation: string | null;

  hiringRoles: string[];
  typicalStack: string[];
  hiringVolume: string | null;
  openToRemote: boolean;
}>;

// ── Candidate API calls ─────────────────────────────────────────────────────

export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  const { data } = await api.get<CandidateProfile>('/candidates/profile');
  return data;
}

export async function updateCandidateProfile(
  dto: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const { data } = await api.put<CandidateProfile>('/candidates/profile', dto);
  return data;
}

export async function fetchProfileCompletion() {
  const { data } = await api.get('/candidates/profile/completion');
  return data;
}

// ── Recruiter API calls ─────────────────────────────────────────────────────

export async function fetchRecruiterProfile(): Promise<RecruiterProfile> {
  const { data } = await api.get<RecruiterProfile>('/recruiters/profile');
  return data;
}

export async function updateRecruiterProfile(
  dto: RecruiterProfileUpdateDto,
): Promise<RecruiterProfile> {
  const { data } = await api.put<RecruiterProfile>('/recruiters/profile', dto);
  return data;
}