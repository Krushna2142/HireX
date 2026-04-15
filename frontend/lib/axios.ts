// lib/axios.ts — THE SINGLE HTTP CLIENT
// Every hook and page imports `api` from here.
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
// Interview API helpers (both mock + recruiter real process)
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
  // Candidate mock interview
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

  getMockSession: (sessionId: string) =>
    api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter interview pipeline
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

  // Candidate real interview process view (same endpoint, role-based response)
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),
};