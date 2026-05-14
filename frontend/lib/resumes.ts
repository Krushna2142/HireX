/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/lib/resumes.ts

import api from '@/lib/axios';

export type ResumeStatus =
  | 'uploaded'
  | 'processing'
  | 'analyzed'
  | 'failed';

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  rawFile?: string;
  status: ResumeStatus;
  createdAt: string;
  storagePath?: string;
  storageBucket?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ResumeAnalysis {
  id: string;
  resumeId: string;
  personalInfo: Record<string, any>;
  workExperience: any[];
  education: any[];
  skills: any[];
  certifications: any[];
  projects: any[];
  languages: any[];
  experienceYears: number;
  experienceLevel: string;
  topSkills: string[];
  industryTags: string[];
  trajectory: string;
  status: string;
  processedAt: string | null;
}

export async function uploadResume(file: File): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);

  // Do NOT manually set Content-Type.
  // Browser/axios must add multipart boundary automatically.
  const { data } = await api.post<Resume>('/resumes/upload-raw', formData);

  return data;
}

export async function triggerAnalysis(resumeId: string): Promise<{
  resumeId: string;
  status: string;
  message: string;
}> {
  const { data } = await api.post(`/resumes/${resumeId}/analyse`);
  return data;
}

export async function getLatestResume(): Promise<Resume | null> {
  try {
    const { data } = await api.get<Resume>('/resumes/latest');
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

export async function getResume(id: string): Promise<Resume> {
  const { data } = await api.get<Resume>(`/resumes/${id}`);
  return data;
}

export async function pollResumeStatus(
  resumeId: string,
  onStatusChange?: (status: ResumeStatus) => void,
  maxAttempts = 40,
  intervalMs = 5_000,
): Promise<Resume> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const resume = await getResume(resumeId);
        onStatusChange?.(resume.status);

        if (resume.status === 'analyzed') return resolve(resume);
        if (resume.status === 'failed') {
          return reject(new Error('Analysis failed. Please try again.'));
        }
        if (attempts >= maxAttempts) {
          return reject(
            new Error('Analysis is taking longer than expected.'),
          );
        }

        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    void poll();
  });
}

export async function getResumeAnalysis(
  resumeId: string,
): Promise<ResumeAnalysis | null> {
  try {
    const { data } = await api.get<ResumeAnalysis>(
      `/resumes/${resumeId}/analysis`,
    );
    return data;
  } catch (err: any) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}