// ts-api/src/ats/ats.types.ts
export const ATS_QUEUE = 'ats-queue';

export const ATS_JOB = {
  CHECK_APPLICATION: 'check-application',
  BATCH_CHECK: 'batch-check',
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

export type AtsBatchQueuePayload = {
  jobId: string;
  batchId: string;
  applicationIds: string[];
  recruiterUserId: string;
};

// ── Resume integrity (anti-cheat) ────────────────────────────────────────
export type IntegritySeverity = 'none' | 'low' | 'medium' | 'high';

export type IntegrityFinding = {
  type: string;
  severity: IntegritySeverity;
  detail: string;
  sample?: string;
};

/**
 * Contract used by AtsService + Python POST /ats/integrity-scan (snake_case).
 * NOTE: AtsIntegrityService keeps its own camelCase variant (with scoreCap)
 * for AtsEvaluatorService. Both coexist safely — no file imports both.
 */
export type IntegrityReport = {
  flagged: boolean;
  severity: IntegritySeverity;
  findings: IntegrityFinding[];
  warnings: string[];
  clean_text: string;
  hidden_lines: string[];
  hidden_ratio: number;
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
  jdRoleFamily?: string;
  jdSeniority?: string;
  jdMinYears?: number;
  requiredSkillsUsed?: string[];
  resumeSkillsDetected?: string[];
  resumeTextLength?: number;
  evidence?: string[];
  warnings?: string[];
  integrity?: {
    flagged: boolean;
    severity: string;
    scoreCap?: number | null;
    hiddenRatio?: number;
    findings?: IntegrityFinding[];
  };
  // ✅ evaluator writes debug info (profileSource, weights, uncappedScore…)
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