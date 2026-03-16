/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/resumes.ts
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type ResumeStatus =
  | 'uploaded'    // file saved, analysis not started
  | 'processing'  // analysis job running
  | 'analyzed'    // complete
  | 'failed';     // analysis failed

export interface Resume {
  id:        string;
  userId:    string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

export interface ResumeAnalysis {
  id:              string;
  resumeId:        string;
  personalInfo:    Record<string, any>;
  workExperience:  any[];
  education:       any[];
  skills:          any[];
  certifications:  any[];
  projects:        any[];
  languages:       any[];
  experienceYears: number;
  experienceLevel: string;
  topSkills:       string[];
  industryTags:    string[];
  trajectory:      string;
  status:          string;
  processedAt:     string | null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Upload resume file (no analysis triggered) ────────────────────────────────

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/resumes/upload-raw`, {
    method:  'POST',
    headers: authHeaders(),
    body:    formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(data.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}

// ── Trigger analysis for an uploaded resume ───────────────────────────────────
// Called when user clicks "Analyse Resume" in the sidebar.

export async function triggerAnalysis(resumeId: string): Promise<{
  resumeId: string;
  status:   string;
  message:  string;
}> {
  const res = await fetch(`${API_URL}/resumes/${resumeId}/analyse`, {
    method:  'POST',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Failed to trigger analysis' }));
    throw new Error(data.message || `Analysis trigger failed: ${res.status}`);
  }

  return res.json();
}

// ── Get the user's latest resume ──────────────────────────────────────────────

export async function getLatestResume(): Promise<Resume | null> {
  const res = await fetch(`${API_URL}/resumes/latest`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch latest resume');
  return res.json();
}

// ── Get resume by ID ──────────────────────────────────────────────────────────

export async function getResume(id: string): Promise<Resume> {
  const res = await fetch(`${API_URL}/resumes/${id}`, {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error('Failed to fetch resume');
  return res.json();
}

// ── Poll resume status until terminal ─────────────────────────────────────────
// Used after triggerAnalysis() to track progress.

export async function pollResumeStatus(
  resumeId:       string,
  onStatusChange?: (status: ResumeStatus) => void,
  maxAttempts     = 40,
  intervalMs      = 5_000,
): Promise<Resume> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const resume = await getResume(resumeId);
        onStatusChange?.(resume.status);

        if (resume.status === 'analyzed') return resolve(resume);
        if (resume.status === 'failed')   return reject(new Error('Analysis failed. Please try again.'));
        if (attempts >= maxAttempts)      return reject(new Error('Analysis is taking longer than expected.'));

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}

// ── Get analysis result ───────────────────────────────────────────────────────

export async function getResumeAnalysis(resumeId: string): Promise<ResumeAnalysis | null> {
  const res = await fetch(`${API_URL}/resumes/${resumeId}/analysis`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch analysis');
  return res.json();
}