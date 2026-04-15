import api from './axios';

export type Stage =
  | 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_IN_PROGRESS' | 'INTERVIEW_PASSED' | 'INTERVIEW_FAILED'
  | 'FINAL_REVIEW' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'ON_HOLD' | 'WITHDRAWN';

export const InterviewsApi = {
  // Existing mock interview endpoints
  startMockSession: (payload: { jobTitle: string; company: string; sessionType?: string; jobId?: string }) =>
    api.post('/interviews/sessions', payload),

  submitMockAnswer: (questionId: string, payload: { answer: string; timeTakenSecs: number }) =>
    api.post(`/interviews/questions/${questionId}/answer`, payload),

  completeMockSession: (sessionId: string) =>
    api.post(`/interviews/sessions/${sessionId}/complete`),

  getMockHistory: () => api.get('/interviews/sessions'),
  getMockSession: (sessionId: string) => api.get(`/interviews/sessions/${sessionId}`),

  // Recruiter real-process endpoints
  initFromApplication: (applicationId: string) =>
    api.post(`/recruiter/interviews/${applicationId}/init`),

  scheduleRound: (interviewId: string, payload: {
    roundType: 'hr' | 'technical' | 'managerial' | 'assignment';
    scheduledAt: string;
    durationMins?: number;
    mode?: 'video' | 'phone' | 'offline';
    interviewerId?: string;
  }) => api.post(`/recruiter/interviews/${interviewId}/rounds`, payload),

  updateStage: (interviewId: string, stage: Stage) =>
    api.patch(`/recruiter/interviews/${interviewId}/stage`, { stage }),

  submitRoundResult: (roundId: string, payload: {
    result: 'pending' | 'pass' | 'fail' | 'no_show' | 'reschedule';
    score?: number;
    feedback?: string;
  }) => api.patch(`/recruiter/interviews/rounds/${roundId}/result`, payload),

  getRecruiterDashboard: (jobId?: string) =>
    api.get('/recruiter/interviews/dashboard', { params: { jobId } }),

  listRecruiterInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }),

  getRecruiterInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),

  // Candidate real-process view
  listCandidateInterviews: (params?: { statusCode?: number; limit?: number }) =>
    api.get('/recruiter/interviews', { params }), // role-based response from backend

  getCandidateInterview: (interviewId: string) =>
    api.get(`/recruiter/interviews/${interviewId}`),
};