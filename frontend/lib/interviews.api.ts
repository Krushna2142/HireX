/**
 * Interviews API Client (ENHANCED)
 * File: frontend/lib/interviews-api.ts
 * 
 * Added: LiveKit token endpoint, room access validation
 */

import api from './axios';

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
  // ✨ NEW: Get LiveKit token for room
  getLivekitToken: (roomId: string) =>
    api.post(`/interviews/room/${encodeURIComponent(roomId)}/token`),

  // ✨ NEW: Validate room access
  getRoomAccess: (roomId: string) =>
    api.get(`/interviews/room/${encodeURIComponent(roomId)}/access`),

  // Existing mock interview methods
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

  // Recruiter methods
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

  // Candidate methods
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/candidate/interviews', { params }),

  getCandidateInterview: (interviewId: string) =>
    api.get(`/candidate/interviews/${interviewId}`),
};