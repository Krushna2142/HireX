import type { AcademicBranch, JobPreset } from '../data/hirexData';

export interface AtsAnalysisResult {
  score: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  verdict: 'Strong Fit' | 'Moderate Fit' | 'Needs Upskilling';
  recommendations: string[];
}

export interface CampusEligibilitySummary {
  totalStudents: number;
  eligibleStudents: number;
  shortlistedStudents: number;
  projectedOffers: number;
  eligibilityRate: number;
  branches: Array<{
    id: string;
    name: string;
    shortCode: string;
    totalStudents: number;
    eligibleStudents: number;
    shortlistedCount: number;
    offersProjected: number;
    topSkills: string[];
  }>;
}

export interface AskHirexReply {
  answer: string;
  followUpSuggestions: string[];
  topic: string;
}

export interface DemoRequestInput {
  name: string;
  email: string;
  role: 'Candidate' | 'Recruiter' | 'College / TPO';
  organization: string;
}

export interface DemoRequestValidation {
  valid: boolean;
  errors: Partial<Record<keyof DemoRequestInput, string>>;
}

export function calculateAtsAnalysis(
  candidateSkills: string[],
  candidateExperience: number,
  job: JobPreset,
): AtsAnalysisResult {
  const normalizedCandidate = new Set(candidateSkills.map((s) => s.trim().toLowerCase()));

  const matchedRequired = job.requiredSkills.filter((skill) =>
    normalizedCandidate.has(skill.toLowerCase()),
  );
  const missingRequired = job.requiredSkills.filter(
    (skill) => !normalizedCandidate.has(skill.toLowerCase()),
  );
  const matchedPreferred = job.preferredSkills.filter((skill) =>
    normalizedCandidate.has(skill.toLowerCase()),
  );

  const reqRatio =
    job.requiredSkills.length > 0 ? matchedRequired.length / job.requiredSkills.length : 1;
  const prefRatio =
    job.preferredSkills.length > 0 ? matchedPreferred.length / job.preferredSkills.length : 1;
  const expRatio = candidateExperience >= job.minExperience ? 1 : candidateExperience / Math.max(1, job.minExperience);

  const rawScore = Math.round(reqRatio * 72 + prefRatio * 18 + expRatio * 10);
  const score = Math.max(0, Math.min(100, rawScore));

  let verdict: AtsAnalysisResult['verdict'] = 'Needs Upskilling';
  if (score >= 80) {
    verdict = 'Strong Fit';
  } else if (score >= 60) {
    verdict = 'Moderate Fit';
  }

  const recommendations: string[] = [];
  if (missingRequired.length > 0) {
    recommendations.push(
      `Highlight hands-on project evidence or production familiarity with ${missingRequired.slice(0, 2).join(' and ')}.`,
    );
  }
  if (matchedPreferred.length < job.preferredSkills.length) {
    const missingPref = job.preferredSkills.filter(
      (s) => !normalizedCandidate.has(s.toLowerCase()),
    );
    if (missingPref.length > 0) {
      recommendations.push(
        `Add measurable outcomes demonstrating ${missingPref[0]} to strengthen differentiation.`,
      );
    }
  }
  if (candidateExperience < job.minExperience) {
    recommendations.push(
      `Surface capstone, internship, or open-source delivery milestones to bridge the ${job.minExperience}-year experience benchmark.`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'Strong alignment across required and preferred skills. Ready for direct shortlisting and AI Interview calibration.',
    );
  }

  return {
    score,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    verdict,
    recommendations,
  };
}

export function computeCampusEligibility(
  branches: AcademicBranch[],
  minCgpa: number,
  selectedBranchId: string,
): CampusEligibilitySummary {
  const filtered =
    selectedBranchId === 'all'
      ? branches
      : branches.filter((b) => b.id === selectedBranchId);

  const mappedBranches = filtered.map((b) => {
    let ratio = b.eligibleRatio75;
    if (minCgpa <= 7.0) {
      ratio = b.eligibleRatio70;
    } else if (minCgpa >= 8.0) {
      ratio = b.eligibleRatio80;
    }
    const eligibleStudents = Math.round(b.totalStudents * ratio);
    const scaleFactor = ratio / Math.max(0.01, b.eligibleRatio75);
    const shortlistedCount = Math.min(
      eligibleStudents,
      Math.round(b.shortlistedCount * scaleFactor),
    );
    const offersProjected = Math.min(
      shortlistedCount,
      Math.round(b.offersProjected * scaleFactor),
    );

    return {
      id: b.id,
      name: b.name,
      shortCode: b.shortCode,
      totalStudents: b.totalStudents,
      eligibleStudents,
      shortlistedCount,
      offersProjected,
      topSkills: b.topSkills,
    };
  });

  const totalStudents = mappedBranches.reduce((acc, b) => acc + b.totalStudents, 0);
  const eligibleStudents = mappedBranches.reduce((acc, b) => acc + b.eligibleStudents, 0);
  const shortlistedStudents = mappedBranches.reduce((acc, b) => acc + b.shortlistedCount, 0);
  const projectedOffers = mappedBranches.reduce((acc, b) => acc + b.offersProjected, 0);
  const eligibilityRate =
    totalStudents > 0 ? Math.round((eligibleStudents / totalStudents) * 100) : 0;

  return {
    totalStudents,
    eligibleStudents,
    shortlistedStudents,
    projectedOffers,
    eligibilityRate,
    branches: mappedBranches,
  };
}

export function getAskHirexReply(query: string): AskHirexReply {
  const q = query.trim().toLowerCase();

  if (q.includes('ats') || q.includes('checker') || q.includes('score')) {
    return {
      topic: 'ATS Checker',
      answer:
        'Demo Preview: The HireX ATS Checker compares a candidate’s parsed competency graph against a target job description. It computes an alignment score, isolates matched vs. missing required skills, and generates actionable recommendations before submission.',
      followUpSuggestions: [
        'How does AI Resume Analysis work?',
        'How can recruiters use HireX?',
      ],
    };
  }

  if (q.includes('resume') || q.includes('parse') || q.includes('analysis')) {
    return {
      topic: 'AI Resume Analysis',
      answer:
        'Demo Preview: AI Resume Analysis ingests PDF or DOCX resumes, normalizes section structures, extracts verified technical and domain skills, maps experience timelines, and produces structured candidate insights ready for matching.',
      followUpSuggestions: [
        'How does ATS Checker work?',
        'What is Campus Hiring?',
      ],
    };
  }

  if (q.includes('campus') || q.includes('college') || q.includes('branch') || q.includes('tpo') || q.includes('student')) {
    return {
      topic: 'Campus Hiring',
      answer:
        'Demo Preview: HireX Campus Hiring lets one recruiter coordinate drives across multiple colleges and academic branches (CE, IT, ECE, Mechanical, Civil, Electrical, AI & DS), automating CGPA/skill eligibility checks, multi-round tracking, and placement analytics.',
      followUpSuggestions: [
        'How can recruiters use HireX?',
        'What is HireX?',
      ],
    };
  }

  if (q.includes('recruiter') || q.includes('pipeline') || q.includes('interview') || q.includes('hire')) {
    return {
      topic: 'Recruiter Workflow',
      answer:
        'Demo Preview: Recruiters publish roles once, inspect ATS-ranked candidate profiles, run structured AI first-round interviews with auditable transcripts, and manage every stage from screening to offer release in one ledger.',
      followUpSuggestions: [
        'What is Campus Hiring?',
        'How does ATS Checker work?',
      ],
    };
  }

  if (q.includes('what is hirex') || q.includes('about') || q.includes('platform')) {
    return {
      topic: 'HireX Overview',
      answer:
        'Demo Preview: HireX is an AI-powered recruitment and campus hiring platform connecting Candidates, Recruiters, and Colleges across six integrated modules: AI Resume Analysis, ATS Checker, Smart Job Matching, Recruitment Management, AI Interview, and Campus Hiring.',
      followUpSuggestions: [
        'How does ATS Checker work?',
        'What is Campus Hiring?',
      ],
    };
  }

  return {
    topic: 'Local Demo Assistant',
    answer:
      'Demo Preview: I am the Ask HireX local demo assistant (no production backend connected). I can walk you through HireX overview, AI Resume Analysis, ATS Checker, Smart Job Matching, Recruiter pipelines, AI Interviews, and multi-branch Campus Hiring.',
    followUpSuggestions: [
      'What is HireX?',
      'How does ATS Checker work?',
      'What is Campus Hiring?',
    ],
  };
}

export function validateDemoRequest(input: DemoRequestInput): DemoRequestValidation {
  const errors: Partial<Record<keyof DemoRequestInput, string>> = {};

  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'Enter your full name (at least 2 characters).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email.trim() || !emailRegex.test(input.email.trim())) {
    errors.email = 'Enter a valid work or academic email address.';
  }

  if (!input.organization.trim() || input.organization.trim().length < 2) {
    errors.organization = 'Enter your company, college, or current role.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export type ModuleVideoRole =
  | 'fragmented-hiring'
  | 'ecosystem'
  | 'resume-analysis'
  | 'ats-checker'
  | 'job-matching'
  | 'recruitment-pipeline'
  | 'ai-interview'
  | 'campus-hiring'
  | 'persona-candidate'
  | 'persona-recruiter'
  | 'persona-college';

export function getModuleVideoDuration(role: ModuleVideoRole): number {
  switch (role) {
    case 'campus-hiring':
      return 14;
    case 'recruitment-pipeline':
    case 'ai-interview':
      return 12;
    default:
      return 10;
  }
}

export function formatVideoTimestamp(progressRatio: number, durationSeconds: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progressRatio) ? progressRatio : 0));
  const totalSec = Math.round(clamped * Math.max(1, durationSeconds));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface SpineScrollState {
  progress: number;
  litUpToY: number;
  activeIndex: number;
  litCount: number;
}

export function computeSpineScrollState(
  nodeOffsetsY: number[],
  trackRectTop: number,
  viewportHeight: number,
  focusRatio = 0.42,
): SpineScrollState {
  if (nodeOffsetsY.length === 0) {
    return { progress: 0, litUpToY: 0, activeIndex: 0, litCount: 0 };
  }

  const firstY = nodeOffsetsY[0];
  const lastY = nodeOffsetsY[nodeOffsetsY.length - 1];
  const span = Math.max(1, lastY - firstY);

  // Focus line in track coordinates
  const focusYInTrack = viewportHeight * focusRatio - trackRectTop;
  const clampedY = Math.max(firstY, Math.min(lastY, focusYInTrack));
  const progress = Math.max(0, Math.min(1, (clampedY - firstY) / span));

  let activeIndex = 0;
  let litCount = 0;
  for (let i = 0; i < nodeOffsetsY.length; i++) {
    if (focusYInTrack >= nodeOffsetsY[i] - 24) {
      litCount = i + 1;
      activeIndex = i;
    }
  }

  return {
    progress,
    litUpToY: clampedY,
    activeIndex,
    litCount,
  };
}


