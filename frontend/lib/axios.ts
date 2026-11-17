import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { getToken, refreshAccessToken, removeToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 60_000,
});

// ─────────────────────────────────────────────────────────────────────────────
// Token refresh guard
// ─────────────────────────────────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function isAuthEndpoint(url?: string): boolean {
  const value = String(url ?? '');
  return (
    value.includes('/auth/login') ||
    value.includes('/auth/register') ||
    value.includes('/auth/refresh') ||
    value.includes('/auth/google') ||
    value.includes('/auth/github') ||
    value.includes('/auth/forgot-password') ||
    value.includes('/auth/reset-password') ||
    value.includes('/auth/verify-email') ||
    value.includes('/auth/resend-verification') ||
    value.includes('/auth/me')
  );
}

async function getFreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }
  isRefreshing = true;
  try {
    const res = await refreshAccessToken();
    const freshToken = res.accessToken;
    processQueue(null, freshToken);
    return freshToken;
  } catch (error) {
    processQueue(error, null);
    removeToken();
    // Redirect to login if on client side
    if (typeof window !== 'undefined') {
      // Store the current path for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.startsWith('/auth')) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      // Redirect to login page
      window.location.href = '/?auth=login';
    }
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request interceptor: attach JWT
// ─────────────────────────────────────────────────────────────────────────────
async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function hasSupabaseSession(): Promise<boolean> {
  return (await getSupabaseAccessToken()) !== null;
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Supabase (Google OAuth) session first so a stale legacy token can't override it; else legacy JWT.
    const token = (await getSupabaseAccessToken()) ?? getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
// Response interceptor: refresh once on 401
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    // Don't retry auth endpoints
    if (isAuthEndpoint(requestUrl)) {
      if (status === 401 && !(await hasSupabaseSession())) {
        removeToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/?auth=login';
        }
      }
      return Promise.reject(error);
    }

    // Supabase-session users have no legacy refresh token: let the caller handle the 401
    // (Supabase refreshes its own token) instead of bouncing them to login.
    if (status === 401 && (await hasSupabaseSession())) {
      return Promise.reject(error);
    }

    // Handle 401 with token refresh
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const freshToken = await getFreshAccessToken();
      if (freshToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      }
    }

    // If refresh failed or no token available
    if (status === 401 && !originalRequest?._retry) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/?auth=login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// ATS / Recruitment Center API
// BullMQ + Redis based mass ATS shortlisting flow
// ─────────────────────────────────────────────────────────────────────────────
export type AtsBatchStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AtsRecommendation =
  | 'STRONG_SHORTLIST'
  | 'SHORTLIST'
  | 'REVIEW'
  | 'WEAK_MATCH'
  | 'REJECT'
  | string;

export type AtsApplicationStatus =
  | 'NOT_QUEUED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | string;

export interface AtsApplicationCandidate {
  id?: string;
  name?: string;
  fullName?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  topSkills?: string[];
  experienceYears?: number | null;
  experienceLevel?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  avatarUrl?: string | null;
}

export interface AtsApplicationResume {
  id?: string;
  fileName?: string;
  file_name?: string;
  storageBucket?: string;
  storagePath?: string;
  storage_path?: string;
  mimeType?: string;
  analysisStatus?: string;
  analyzedAt?: string | null;
  extractedText?: string | null;
  analysisJson?: any;
  resumeAnalysis?: any;
  url?: string | null;
  fileUrl?: string | null;
  publicUrl?: string | null;
}

export interface AtsApplicationJob {
  id?: string;
  title?: string;
  companyName?: string;
  company_name?: string;
  requiredSkills?: string[] | string | null;
}

export interface AtsApplicationRow {
  id: string;
  status: string;
  applied_at?: string;
  appliedAt?: string;
  match_score?: number | null;
  ats_status?: AtsApplicationStatus;
  ats_score?: number | null;
  ats_recommendation?: AtsRecommendation | null;
  ats_matched_skills?: string[];
  ats_missing_skills?: string[];
  ats_reason?: string | null;
  ats_breakdown?: any;
  ats_error?: string | null;
  ats_checked_at?: string | null;
  candidate?: AtsApplicationCandidate | null;
  resume?: AtsApplicationResume | null;
  job?: AtsApplicationJob | null;
  events?: any[];
}

export interface AtsApplicationsResponse {
  jobId: string;
  total: number;
  applicants: AtsApplicationRow[];
}

export interface AtsRunSingleResponse {
  applicationId: string;
  queueJobId: string | number;
  status: 'QUEUED' | string;
}

export interface AtsRunBulkResponse {
  batchId: string;
  jobId: string;
  total: number;
  queued: number;
  shortlistTarget: number;
  status: 'QUEUED' | string;
}

export interface AtsBatchResponse {
  id: string;
  jobId: string;
  status: AtsBatchStatus;
  total: number;
  queued: number;
  processed: number;
  failed: number;
  shortlistTarget: number;
  progress: number;
  error?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AtsAutoShortlistResponse {
  jobId: string;
  vacancyCount: number;
  shortlistTarget: number;
  shortlisted: number;
  backup: number;
  selectedApplicationIds: string[];
  backupApplicationIds: string[];
}

export const atsApi = {
  listApplications: (jobId: string) =>
    api.get<AtsApplicationsResponse>(
      `/ats/jobs/${encodeURIComponent(jobId)}/applications`,
    ),
  runSingle: (applicationId: string) =>
    api.post<AtsRunSingleResponse>(
      `/ats/applications/${encodeURIComponent(applicationId)}/run`,
    ),
  runBulk: (jobId: string, vacancyCount: number, shortlistTarget?: number) =>
    api.post<AtsRunBulkResponse>(
      `/ats/jobs/${encodeURIComponent(jobId)}/run-bulk`,
      {
        vacancyCount,
        shortlistTarget,
      },
    ),
  getBatch: (batchId: string) =>
    api.get<AtsBatchResponse>(
      `/ats/batches/${encodeURIComponent(batchId)}`,
    ),
  autoShortlist: (jobId: string, vacancyCount: number, shortlistTarget?: number) =>
    api.post<AtsAutoShortlistResponse>(
      `/ats/jobs/${encodeURIComponent(jobId)}/auto-shortlist`,
      {
        vacancyCount,
        shortlistTarget,
      },
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Interview / feedback shared types
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

export type FeedbackRecommendation = 'HIRE' | 'REJECT' | 'HOLD';

export interface CreateFeedbackPayload {
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  culture_fit_score?: number;
  strengths?: string;
  improvements?: string;
  notes?: string;
  recommendation: FeedbackRecommendation;
}

// ─────────────────────────────────────────────────────────────────────────────
// interviewApi — mock, recruiter, candidate, custom room operations
// LiveKit removed. This now supports custom WebRTC room flow.
// ─────────────────────────────────────────────────────────────────────────────
export const interviewApi = {
  // Candidate mock interview
  startMockSession: (payload: {
    jobTitle: string;
    company: string;
    sessionType?: string;
    jobId?: string;
  }) => api.post('/interviews/sessions', payload),

  submitMockAnswer: (
    questionId: string,
    payload: {
      answer: string;
      timeTakenSecs: number;
    },
  ) => api.post(`/interviews/questions/${encodeURIComponent(questionId)}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${encodeURIComponent(sessionId)}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) =>
    api.get(`/interviews/sessions/${encodeURIComponent(sessionId)}`),

  // Recruiter interview workflow
  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${encodeURIComponent(applicationId)}/init`),

  scheduleRound: (
    interviewId: string,
    payload: {
      roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
      scheduledAt: string;
      durationMins?: number;
      mode?: 'video' | 'phone' | 'offline';
      interviewerId?: string;
    },
  ) => api.post(`/recruiter/interviews/${encodeURIComponent(interviewId)}/rounds`, payload),

  updateStage: (interviewId: string, stage: InterviewStage) =>
    api.patch(`/recruiter/interviews/${encodeURIComponent(interviewId)}/stage`, {
      stage,
    }),

  submitRoundResult: (
    roundId: string,
    payload: {
      result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
      score?: number;
      feedback?: string;
    },
  ) =>
    api.patch(
      `/recruiter/interviews/rounds/${encodeURIComponent(roundId)}/result`,
      payload,
    ),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', {
      params: jobId ? { jobId } : undefined,
    }),

  listRecruiterInterviews: (params?: {
    statusCode?: number;
    limit?: number;
    jobId?: string;
  }) => api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${encodeURIComponent(interviewId)}`),

  // Candidate scheduled interviews
  listCandidateInterviews: (params?: {
    statusCode?: number;
    limit?: number;
  }) => api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${encodeURIComponent(interviewId)}`),

  // Custom WebRTC interview room operations
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),
  getRoomState: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/state`),
  joinRoom: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/join`),
  leaveRoom: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/leave`),
  endRoom: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/end`),
  sendChatMessage: (roomId: string, message: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/chat`, {
      message,
    }),
  saveScorecard: (
    roomId: string,
    payload: {
      roundId?: string;
      scores?: Record<string, number>;
      notes?: string;
      recommendation?: string;
    },
  ) =>
    api.post(
      `/interviews/room/${encodeURIComponent(roomId)}/scorecard`,
      payload,
    ),
  getAiFollowUp: (
    roomId: string,
    payload: {
      transcript?: string;
      question?: string;
      context?: string;
    },
  ) =>
    api.post(
      `/interviews/room/${encodeURIComponent(roomId)}/ai/follow-up`,
      payload,
    ),
  getAiSummary: (
    roomId: string,
    payload: {
      transcript?: string;
      notes?: string;
    },
  ) =>
    api.post(
      `/interviews/room/${encodeURIComponent(roomId)}/ai/summary`,
      payload,
    ),
};

// ─────────────────────────────────────────────────────────────────────────────
// feedbackApi — post-interview scoring
// ─────────────────────────────────────────────────────────────────────────────
export const feedbackApi = {
  create: (roundId: string, payload: CreateFeedbackPayload) =>
    api.post(`/feedback/round/${encodeURIComponent(roundId)}`, payload),
  getByRound: (roundId: string) =>
    api.get(`/feedback/round/${encodeURIComponent(roundId)}`),
  getByInterview: (interviewId: string) =>
    api.get(`/feedback/interview/${encodeURIComponent(interviewId)}`),
  getSummary: (interviewId: string) =>
    api.get(`/feedback/interview/${encodeURIComponent(interviewId)}/summary`),
  update: (feedbackId: string, payload: Partial<CreateFeedbackPayload>) =>
    api.patch(`/feedback/${encodeURIComponent(feedbackId)}`, payload),
};

// ─────────────────────────────────────────────────────────────────────────────
// queueApi — admin BullMQ queue monitor
// Consumed by components/admin/QueueMonitor.tsx
// ─────────────────────────────────────────────────────────────────────────────
export interface QueueMetrics {
  queue: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
  timestamp: string;
  error?: string;
}

export const queueApi = {
  getMetrics: () => api.get<QueueMetrics>('/admin/queue-metrics'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Campus Mass Hiring API
// ─────────────────────────────────────────────────────────────────────────────

export type DriveStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED' | 'COMPLETED';

export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_INFO';

export type OfferStatus =
  | 'DRAFT' | 'RELEASED' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED' | 'JOINED';

export type CampusBatchStatus =
  | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface EligibilityCheck {
  key: string;
  label: string;
  state: 'pass' | 'fail' | 'missing' | 'skipped';
  required?: unknown;
  actual?: unknown;
  message: string;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  reasons: string[];
  missingFields: string[];
  checks: EligibilityCheck[];
}

export interface CampusCompany {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  location?: string | null;
  size?: string | null;
  industry: string[];
  isVerified: boolean;
  _count?: { drives: number; members: number };
}

export interface CampusBranch {
  id: string;
  name: string;
  code: string;
  programLevel: 'UG' | 'PG' | 'DIPLOMA' | 'OTHER';
  canonicalKey?: string | null;
  isActive: boolean;
  collegeId: string;
  departmentId: string;
  college?: { id: string; name: string };
  department?: { id: string; name: string };
  aliases?: { id: string; alias: string }[];
  _count?: { students: number };
}

export interface CampusStudentRow {
  id: string;
  userId: string;
  enrollmentNo: string;
  graduationYear: number;
  cgpa?: string | number | null;
  tenthPct?: string | number | null;
  twelfthPct?: string | number | null;
  activeBacklogs?: number | null;
  historicalBacklogs?: number | null;
  status: string;
  user: { id: string; fullName: string | null; email: string; avatarUrl?: string | null };
  branch: { id: string; name: string; code: string; departmentId: string };
}

export interface CampusDrive {
  id: string;
  jobId: string;
  companyId: string;
  title: string;
  status: DriveStatus;
  applicationOpenAt?: string | null;
  applicationCloseAt?: string | null;
  driveDate?: string | null;
  vacancies: number;
  ctcMin?: string | number | null;
  ctcMax?: string | number | null;
  currency: string;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  requiredDocuments: string[];
  roundsTemplate: unknown;
  job?: { id: string; title: string; description?: string; requiredSkills?: string[]; status?: string; applicantCount?: number };
  company?: { id: string; name: string; logoUrl?: string | null; website?: string | null };
  colleges?: { id: string; collegeId: string; scope: unknown; college?: { id: string; name: string } }[];
  eligibility?: { combinator: 'AND' | 'OR'; rule: unknown } | null;
  criteria?: unknown[];
  _count?: { details: number; offers: number };
}

export interface CampusBatch {
  id: string;
  type: 'IMPORT_STUDENTS' | 'BULK_STATUS' | 'BULK_NOTIFY' | 'EXPORT';
  status: CampusBatchStatus;
  total: number;
  processed: number;
  failed: number;
  progress: number;
  result?: Record<string, unknown>;
  error?: string | null;
}

export interface StudentDriveView {
  id: string;
  title: string;
  company: { id: string; name: string; logoUrl?: string | null };
  jobRole: string;
  description: string;
  requiredSkills: string[];
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  ctcMin?: string | number | null;
  ctcMax?: string | number | null;
  currency: string;
  vacancies: number;
  applicationOpenAt?: string | null;
  applicationCloseAt?: string | null;
  driveDate?: string | null;
  requiredDocuments: string[];
  eligibility: EligibilityResult;
  canApply: boolean;
  application: { id: string; status: string; appliedAt: string } | null;
}

export interface CampusApplicantRow {
  id: string;
  status: string;
  appliedAt: string;
  atsScore?: number | null;
  atsStatus?: string | null;
  candidate: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl?: string | null;
    campusStudents: {
      id: string;
      enrollmentNo: string;
      graduationYear: number;
      cgpa?: string | number | null;
      activeBacklogs?: number | null;
      historicalBacklogs?: number | null;
      branch: { id: string; name: string; code: string };
      college: { id: string; name: string };
    }[];
  };
  resume?: { id: string; originalFileName: string; analysisStatus: string } | null;
  campusDetail?: {
    eligibilityStatus: EligibilityStatus;
    missingFields: string[];
    currentRoundKey?: string | null;
    eligibilitySnapshot: unknown;
  } | null;
  campusOffer?: { id: string; status: OfferStatus; ctc?: string | number | null } | null;
  statusEvents?: unknown[];
}

export interface Paginated<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  rows: T[];
}

const enc = encodeURIComponent;

export const campusApi = {
  // ── Company ──
  createCompany: (payload: {
    name?: string; website?: string; logoUrl?: string;
    description?: string; location?: string; size?: string; industry?: string[];
  }) => api.post<CampusCompany>('/campus/companies', payload),

  myCompanies: () => api.get<CampusCompany[]>('/campus/companies/mine'),

  // ── College / academics ──
  createCollege: (payload: {
    name: string; code?: string; city?: string; state?: string;
    country?: string; website?: string;
  }) => api.post('/campus/colleges', payload),

  listColleges: () => api.get('/campus/colleges'),

  myColleges: () => api.get('/campus/colleges/mine'),

  addCollegeMember: (collegeId: string, payload: { userId: string; role: string }) =>
    api.post(`/campus/colleges/${enc(collegeId)}/members`, payload),

  createCampus: (collegeId: string, payload: { name: string; city?: string }) =>
    api.post(`/campus/colleges/${enc(collegeId)}/campuses`, payload),

  createDepartment: (collegeId: string, payload: { name: string; code: string; campusId?: string }) =>
    api.post(`/campus/colleges/${enc(collegeId)}/departments`, payload),

  createBranch: (collegeId: string, payload: {
    departmentId: string; name: string; code: string;
    programLevel?: 'UG' | 'PG' | 'DIPLOMA' | 'OTHER';
    canonicalKey?: string; aliases?: string[];
  }) => api.post<CampusBranch>(`/campus/colleges/${enc(collegeId)}/branches`, payload),

  updateBranch: (branchId: string, payload: {
    name?: string; code?: string; programLevel?: string;
    canonicalKey?: string; isActive?: boolean; aliases?: string[];
  }) => api.patch<CampusBranch>(`/campus/branches/${enc(branchId)}`, payload),

  academicTree: (collegeId: string) =>
    api.get(`/campus/colleges/${enc(collegeId)}/academics`),

  branchCatalogue: () => api.get<CampusBranch[]>('/campus/branches/catalogue'),

  // ── Students ──
  listStudents: (collegeId: string, params?: {
    page?: number; limit?: number; search?: string; branchId?: string;
    departmentId?: string; graduationYear?: number; minCgpa?: number;
    maxCgpa?: number; maxActiveBacklogs?: number; status?: string;
  }) => api.get<{ total: number; page: number; limit: number; totalPages: number; students: CampusStudentRow[] }>(
    `/campus/colleges/${enc(collegeId)}/students`, { params },
  ),

  importStudents: (collegeId: string, payload: {
    rows: Array<{
      email: string; fullName?: string; enrollmentNo: string; branchId: string;
      campusId?: string; graduationYear: number; cgpa?: number; tenthPct?: number;
      twelfthPct?: number; activeBacklogs?: number; historicalBacklogs?: number;
      customAcademics?: Record<string, unknown>;
    }>;
    idempotencyKey?: string;
  }) => api.post<{ batchId: string; total: number; status: CampusBatchStatus }>(
    `/campus/colleges/${enc(collegeId)}/students/import`, payload,
  ),

  batchStatus: (batchId: string) =>
    api.get<CampusBatch>(`/campus/batches/${enc(batchId)}`),

  // ── Recruiter drives ──
  createDrive: (payload: {
    companyId?: string; title: string; jobRole: string; description: string;
    requiredSkills?: string[]; employmentType?: string; workMode?: string;
    ctcMin?: number; ctcMax?: number; currency?: string; location?: string;
    applicationOpenAt?: string; applicationCloseAt?: string; driveDate?: string;
    vacancies?: number; requiredDocuments?: string[];
    roundsTemplate?: Array<Record<string, unknown>>;
  }) => api.post<CampusDrive>('/campus/drives', payload),

  myDrives: () => api.get<CampusDrive[]>('/campus/drives/mine'),

  recruiterOverview: () => api.get('/campus/drives/overview'),

  driveDetail: (driveId: string) => api.get(`/campus/drives/${enc(driveId)}`),

  updateDrive: (driveId: string, payload: Record<string, unknown>) =>
    api.patch<CampusDrive>(`/campus/drives/${enc(driveId)}`, payload),

  setDriveColleges: (driveId: string, payload: {
    allColleges?: boolean;
    colleges?: Array<{ collegeId: string; scope?: { departmentIds?: string[]; branchIds?: string[] } }>;
  }) => api.put(`/campus/drives/${enc(driveId)}/colleges`, payload),

  setDriveEligibility: (driveId: string, payload: {
    combinator?: 'AND' | 'OR';
    rule: {
      graduationYears?: number[]; allowedBranchIds?: string[];
      allowedCanonicalKeys?: string[]; allowAllBranches?: boolean;
      minimumCGPA?: number; minimum10thPercentage?: number; minimum12thPercentage?: number;
      maximumActiveBacklogs?: number; maximumHistoricalBacklogs?: number;
      allowHistoricalBacklogs?: boolean;
      custom?: Array<{ field: string; operator: string; value?: unknown; label?: string }>;
    };
  }) => api.put(`/campus/drives/${enc(driveId)}/eligibility`, payload),

  setDriveCriteria: (driveId: string, payload: {
    criteria: Array<{
      branchSelector: string; minCgpa?: number; minTenthPct?: number; minTwelfthPct?: number;
      maxActiveBacklogs?: number; maxHistoricalBacklogs?: number; allowHistorical?: boolean;
      custom?: Array<{ field: string; operator: string; value?: unknown; label?: string }>;
    }>;
  }) => api.put(`/campus/drives/${enc(driveId)}/criteria`, payload),

  publishDrive: (driveId: string) =>
    api.post<CampusDrive>(`/campus/drives/${enc(driveId)}/publish`),

  setDriveStatus: (driveId: string, status: DriveStatus) =>
    api.patch(`/campus/drives/${enc(driveId)}/status`, { status }),

  // ── Applicants ──
  applicants: (driveId: string, params?: {
    page?: number; limit?: number; search?: string; branchId?: string;
    graduationYear?: number; minCgpa?: number; status?: string;
    eligibilityStatus?: EligibilityStatus; roundKey?: string;
  }) => api.get<{ driveId: string; total: number; page: number; limit: number; totalPages: number; applicants: CampusApplicantRow[] }>(
    `/campus/drives/${enc(driveId)}/applicants`, { params },
  ),

  bulkStatus: (driveId: string, payload: {
    applicationIds: string[]; status: string; reason?: string;
    notify?: boolean; idempotencyKey?: string;
  }) => api.post<{ batchId: string; total: number; status: CampusBatchStatus }>(
    `/campus/drives/${enc(driveId)}/applicants/bulk-status`, payload,
  ),

  bulkNotify: (driveId: string, payload: {
    applicationIds: string[]; title: string; message: string; idempotencyKey?: string;
  }) => api.post<{ batchId: string; total: number; status: CampusBatchStatus }>(
    `/campus/drives/${enc(driveId)}/applicants/bulk-notify`, payload,
  ),

  exportApplicants: (driveId: string) =>
    api.post<{ batchId: string; status: CampusBatchStatus }>(`/campus/drives/${enc(driveId)}/export`),

  scheduleInterview: (driveId: string, applicationId: string, payload: {
    roundType: 'technical' | 'hr' | 'managerial' | 'assignment';
    scheduledAt: string; durationMins?: number;
    mode?: 'video' | 'phone' | 'offline'; interviewerId?: string;
  }) => api.post(
    `/campus/drives/${enc(driveId)}/applicants/${enc(applicationId)}/interviews`, payload,
  ),

  // ── Offers ──
  releaseOffer: (driveId: string, payload: {
    applicationId: string; ctc?: number; currency?: string; roleTitle?: string;
    location?: string; joiningDate?: string; expiresAt?: string; letterPath?: string;
  }) => api.post(`/campus/drives/${enc(driveId)}/offers`, payload),

  driveOffers: (driveId: string) => api.get(`/campus/drives/${enc(driveId)}/offers`),

  markJoined: (offerId: string) => api.patch(`/campus/offers/${enc(offerId)}/joined`),

  driveAnalytics: (driveId: string) => api.get(`/campus/drives/${enc(driveId)}/analytics`),

  // ── Placement cell ──
  placementDrives: (collegeId: string) =>
    api.get<CampusDrive[]>(`/campus/placement/colleges/${enc(collegeId)}/drives`),

  eligibleStudents: (driveId: string, collegeId: string, params?: {
    page?: number; limit?: number; status?: 'all' | EligibilityStatus;
    branchId?: string; graduationYear?: number;
  }) => api.get<{
    driveId: string; collegeId: string;
    summary: { total: number; eligible: number; notEligible: number; needsInfo: number };
    total: number; page: number; limit: number; totalPages: number;
    students: Array<{
      id: string; userId: string; name: string | null; email: string;
      enrollmentNo: string; branch: string; graduationYear: number;
      cgpa?: string | number | null;
      status: EligibilityStatus; reasons: string[]; missingFields: string[];
      checks: EligibilityCheck[];
    }>;
  }>(`/campus/placement/drives/${enc(driveId)}/eligible-students`, {
    params: { collegeId, ...params },
  }),

  collegeOffers: (collegeId: string) =>
    api.get(`/campus/placement/colleges/${enc(collegeId)}/offers`),

  collegeAnalytics: (collegeId: string) =>
    api.get(`/campus/placement/colleges/${enc(collegeId)}/analytics`),

  // ── Student ──
  studentDrives: () => api.get<StudentDriveView[]>('/campus/student/drives'),

  applyDrive: (driveId: string, payload?: { resumeId?: string; coverLetter?: string }) =>
    api.post<{ applicationId: string; eligibility: EligibilityStatus; reasons: string[] }>(
      `/campus/student/drives/${enc(driveId)}/apply`, payload ?? {},
    ),

  studentApplications: () => api.get('/campus/student/applications'),

  studentOffers: () => api.get('/campus/student/offers'),

  respondOffer: (offerId: string, payload: { response: 'ACCEPTED' | 'DECLINED'; note?: string }) =>
    api.patch(`/campus/student/offers/${enc(offerId)}/respond`, payload),
};