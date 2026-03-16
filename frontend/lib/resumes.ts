// frontend/lib/resumes.ts
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  rawFile: string;
  status: ResumeStatus;
  createdAt: string;
  analysisStatus?: 'queued' | 'completed' | 'failed';
}

export interface PersonalInfo {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface Skill {
  name: string;
  category: string;
  proficiency: number;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: number | null;
    gpa: string | null;
  }>;
  skills: Skill[];
  certifications: Array<{
    name: string;
    issuer: string;
    issueDate: string | null;
    expiryDate: string | null;
  }>;
  projects: Array<{
    title: string;
    description: string;
    techStack: string[];
    repoUrl: string | null;
    liveUrl: string | null;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  experienceYears: number;
  experienceLevel: 'junior' | 'mid' | 'senior' | 'principal';
  topSkills: string[];
  industryTags: string[];
  trajectory: string;
  status: string;
  processedAt: string | null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Upload resume file
export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/resumes/upload-raw`, {
    method: 'POST',
    headers: authHeaders(), // No Content-Type — browser sets multipart boundary
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(data.message || `Upload failed with status ${res.status}`);
  }

  return res.json();
}

// Get single resume by ID
export async function getResume(id: string): Promise<Resume> {
  const res = await fetch(`${API_URL}/resumes/${id}`, {
    headers: authHeaders(),
  });

  if (!res.ok) throw new Error('Failed to fetch resume');
  return res.json();
}

// Get analysis result for a resume
export async function getResumeAnalysis(resumeId: string): Promise<ResumeAnalysis | null> {
  const res = await fetch(`${API_URL}/resumes/${resumeId}/analysis`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null; // Analysis not ready yet
  if (!res.ok) throw new Error('Failed to fetch analysis');
  return res.json();
}

// Poll until resume status is 'analyzed' or 'failed'
export async function pollResumeStatus(
  resumeId: string,
  onStatusChange?: (status: ResumeStatus) => void,
  maxAttempts = 40,         // 40 × 5s = 3.3 min max wait
  intervalMs = 5000,
): Promise<Resume> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const resume = await getResume(resumeId);
        onStatusChange?.(resume.status);

        if (resume.status === 'analyzed') {
          resolve(resume);
          return;
        }

        if (resume.status === 'failed') {
          reject(new Error('Resume analysis failed. Please try uploading again.'));
          return;
        }

        if (attempts >= maxAttempts) {
          reject(new Error('Analysis is taking longer than expected. Check back in a few minutes.'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}