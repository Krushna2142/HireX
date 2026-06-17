/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/axios.ts

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

import { getToken, refreshAccessToken, removeToken } from '@/lib/auth';

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

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();

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
      if (status === 401) {
        removeToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/?auth=login';
        }
      }
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

  runBulk: (jobId: string, vacancyCount: number) =>
    api.post<AtsRunBulkResponse>(
      `/ats/jobs/${encodeURIComponent(jobId)}/run-bulk`,
      {
        vacancyCount,
      },
    ),

  getBatch: (batchId: string) =>
    api.get<AtsBatchResponse>(
      `/ats/batches/${encodeURIComponent(batchId)}`,
    ),

  autoShortlist: (jobId: string, vacancyCount: number) =>
    api.post<AtsAutoShortlistResponse>(
      `/ats/jobs/${encodeURIComponent(jobId)}/auto-shortlist`,
      {
        vacancyCount,
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