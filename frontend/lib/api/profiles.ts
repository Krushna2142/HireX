/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/axios';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CandidateProfile {
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
  pipeline?: {
    totalJobs: number;
    totalApplications: number;
    newApplicants: number;
    shortlisted: number;
    inInterview: number;
    offered: number;
    activeJobs: number;
    offerRate: number;
    avgDaysToHire: number;
  };
  recentApplicants?: any[];
}

// ── API calls ────────────────────────────────────────────────────────────────

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

export async function fetchRecruiterProfile(): Promise<RecruiterProfile> {
  const { data } = await api.get<RecruiterProfile>('/recruiters/profile');
  return data;
}

export async function updateRecruiterProfile(
  dto: Partial<RecruiterProfile>,
): Promise<RecruiterProfile> {
  const { data } = await api.put<RecruiterProfile>('/recruiters/profile', dto);
  return data;
}