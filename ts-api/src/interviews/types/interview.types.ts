export enum InterviewStage {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_IN_PROGRESS = 'INTERVIEW_IN_PROGRESS',
  INTERVIEW_PASSED = 'INTERVIEW_PASSED',
  INTERVIEW_FAILED = 'INTERVIEW_FAILED',
  FINAL_REVIEW = 'FINAL_REVIEW',
  OFFERED = 'OFFERED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  ON_HOLD = 'ON_HOLD',
  WITHDRAWN = 'WITHDRAWN',
}

export enum RoundType {
  HR = 'hr',
  TECHNICAL = 'technical',
  MANAGERIAL = 'managerial',
  ASSIGNMENT = 'assignment',
}

export enum RoundResult {
  PENDING = 'pending',
  PASS = 'pass',
  FAIL = 'fail',
  NO_SHOW = 'no_show',
  RESCHEDULE = 'reschedule',
}

export interface InterviewRoomParticipant {
  userId: string;
  socketId: string;
  displayName?: string;
  role: 'recruiter' | 'candidate';
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  joinedAt: number;
}

export interface RoomSnapshot {
  roomId: string;
  participants: InterviewRoomParticipant[];
  hostUserId?: string;
  endedAt?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface InterviewScorecard {
  communication: number;
  technical: number;
  confidence: number;
  problemSolving: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
  aiNotes?: string;
}

export interface AIAssistancePayload {
  resume: string;
  jobDescription: string;
  interviewStage: InterviewStage;
  roundType: RoundType;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  followUpQuestions: string[];
  evaluationCriteria: string[];
}

export interface TranscriptParagraph {
  timestamp: number;
  speaker: 'candidate' | 'recruiter';
  text: string;
}

export interface RecordingMetadata {
  roomId: string;
  interviewId: string;
  roundId: string;
  candidateName: string;
  recruiterName: string;
  startedAt: string;
  endedAt: string;
}