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
});

// ─────────────────────────────────────────────────────────────────────────────
// Token refresh guard
// ─────────────────────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

function isAuthEndpoint(url?: string): boolean {
  const value = String(url ?? '');

  return (
    value.includes('/auth/login') ||
    value.includes('/auth/register') ||
    value.includes('/auth/refresh') ||
    value.includes('/auth/google') ||
    value.includes('/auth/github') ||
    value.includes('/auth/forgot-password') ||
    value.includes('/auth/reset-password')
  );
}

async function getFreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .then((res) => res.accessToken)
      .catch(() => {
        removeToken();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request interceptor: attach JWT
// ─────────────────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();

    if (token) {
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

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const freshToken = await getFreshAccessToken();

      if (freshToken) {
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      }
    }

    if (status === 401 && isAuthEndpoint(originalRequest?.url)) {
      removeToken();
    }

    return Promise.reject(error);
  },
);

export default api;

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
// interviewApi — mock, recruiter, candidate, room operations
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
  ) => api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),

  getMockSession: (sessionId: string) =>
    api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter interview workflow
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
    api.get('/recruiter/interviews/dashboard', {
      params: jobId ? { jobId } : undefined,
    }),

  listRecruiterInterviews: (params?: {
    statusCode?: number;
    limit?: number;
    jobId?: string;
  }) => api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate scheduled interviews
  listCandidateInterviews: (params?: {
    statusCode?: number;
    limit?: number;
  }) => api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),

  // Interview room / LiveKit
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),

  getRoomState: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/state`),

  getLivekitToken: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/token`),

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
    api.post(`/feedback/round/${roundId}`, payload),

  getByRound: (roundId: string) => api.get(`/feedback/round/${roundId}`),

  getByInterview: (interviewId: string) =>
    api.get(`/feedback/interview/${interviewId}`),

  getSummary: (interviewId: string) =>
    api.get(`/feedback/interview/${interviewId}/summary`),

  update: (feedbackId: string, payload: Partial<CreateFeedbackPayload>) =>
    api.patch(`/feedback/${feedbackId}`, payload),
};