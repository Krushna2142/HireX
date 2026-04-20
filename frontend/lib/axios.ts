// frontend/lib/axios.ts
// Complete replacement — adds feedbackApi alongside existing interviewApi

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({ baseURL: API_URL });

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('jc_token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: 401 cleanup ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('jc_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  },
);

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// Type exports
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
  technical_score:       number; // 1–5
  communication_score:   number; // 1–5
  problem_solving_score: number; // 1–5
  culture_fit_score?:    number; // 1–5 (defaults to 3)
  strengths?:            string;
  improvements?:         string;
  notes?:                string;
  recommendation:        FeedbackRecommendation;
}

// ─────────────────────────────────────────────────────────────────────────────
// interviewApi — recruiter + candidate operations
// ─────────────────────────────────────────────────────────────────────────────

export const interviewApi = {
  // Mock (candidate self-practice)
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

  // Recruiter — initialize + manage
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

  listRecruiterInterviews: (params?: {
    statusCode?: number;
    limit?: number;
    jobId?: string;
  }) => api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),

  // Room access
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),

  getLivekitToken: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/token`),
};

// ─────────────────────────────────────────────────────────────────────────────
// feedbackApi — post-interview scoring
// ─────────────────────────────────────────────────────────────────────────────

export const feedbackApi = {
  // Create feedback for a specific round (recruiter only)
  create: (roundId: string, payload: CreateFeedbackPayload) =>
    api.post(`/feedback/round/${roundId}`, payload),

  // Get feedback for a specific round
  getByRound: (roundId: string) =>
    api.get(`/feedback/round/${roundId}`),

  // All feedback across all rounds for an interview
  getByInterview: (interviewId: string) =>
    api.get(`/feedback/interview/${interviewId}`),

  // Aggregated summary (avg scores + recommendation)
  getSummary: (interviewId: string) =>
    api.get(`/feedback/interview/${interviewId}/summary`),

  // Update existing feedback
  update: (feedbackId: string, payload: Partial<CreateFeedbackPayload>) =>
    api.patch(`/feedback/${feedbackId}`, payload),
};
