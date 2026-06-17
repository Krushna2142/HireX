/* eslint-disable prettier/prettier */
// ts-api/src/ats/ats.types.ts

export const ATS_QUEUE = 'ats-queue';

export const ATS_JOB = {
  CHECK_APPLICATION: 'check-application',
} as const;

export type AtsJobName = (typeof ATS_JOB)[keyof typeof ATS_JOB];

export type AtsRecommendation =
  | 'STRONG_SHORTLIST'
  | 'SHORTLIST'
  | 'REVIEW'
  | 'WEAK_MATCH'
  | 'REJECT';

export type AtsQueuePayload = {
  applicationId: string;
  jobId: string;
  recruiterUserId: string;
  batchId?: string;
  source: 'single' | 'bulk';
};

export type AtsBreakdown = {
  requiredSkillMatch: number;
  semanticMatch: number;
  projectRelevance: number;
  experienceRelevance: number;
  roleTitleRelevance: number;
  sectionCompleteness: number;
  keywordPlacement: number;
  formattingReadability: number;

  // Extra debugging / explainability fields from Python ATS
  jdRoleFamily?: string;
  requiredSkillsUsed?: string[];
  resumeSkillsDetected?: string[];
  resumeTextLength?: number;
  evidence?: string[];
  warnings?: string[];

  // Optional flexible debug object
  debug?: Record<string, unknown>;
};

export type AtsCheckResult = {
  score: number;
  recommendation: AtsRecommendation;
  matchedSkills: string[];
  missingSkills: string[];
  reason: string;
  breakdown: AtsBreakdown;
};