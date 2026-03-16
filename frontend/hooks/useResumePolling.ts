/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// hooks/useResumePolling.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

export interface Resume {
  id:        string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

export interface Analysis {
  id:              string;
  resumeId:        string;
  personalInfo:    Record<string, unknown>;
  workExperience:  unknown[];
  education:       unknown[];
  skills:          unknown[];
  topSkills:       string[];
  industryTags:    string[];
  experienceYears: number;
  experienceLevel: string;
  trajectory:      string;
  summary:         string;
  processedAt:     string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
    : null;

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── useResumes — loads all resumes for the current user ───────────────────────

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Resume[]>('/resumes');
      setResumes(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { resumes, loading, error, reload: load };
}

// ── useAnalysis — triggers analysis + polls status until done ─────────────────

export function useAnalysis(resumeId: string | null) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status,   setStatus]   = useState<ResumeStatus | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll resume status every 4s until done or failed
  const pollStatus = useCallback(async (id: string) => {
    try {
      const resume = await apiFetch<Resume>(`/resumes/${id}`);
      setStatus(resume.status);

      if (resume.status === 'analyzed') {
        stopPolling();
        const a = await apiFetch<Analysis>(`/resumes/${id}/analysis`);
        setAnalysis(a);
        setLoading(false);
      } else if (resume.status === 'failed') {
        stopPolling();
        setError('Analysis failed — please try again');
        setLoading(false);
      }
    } catch (e) {
      setError((e as Error).message);
      stopPolling();
      setLoading(false);
    }
  }, [stopPolling]);

  // Trigger analysis on demand
  const triggerAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      await apiFetch(`/resumes/${id}/analyse`, { method: 'POST' });
      setStatus('processing');
      pollRef.current = setInterval(() => { void pollStatus(id); }, 4_000);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [pollStatus]);

  // On mount — if resume already analysed, load existing result
  useEffect(() => {
    if (!resumeId) {
      setAnalysis(null);
      setStatus(null);
      return;
    }

    void apiFetch<Resume>(`/resumes/${resumeId}`).then(r => {
      setStatus(r.status);
      if (r.status === 'analyzed') {
        void apiFetch<Analysis>(`/resumes/${resumeId}/analysis`).then(setAnalysis);
      }
    }).catch(() => null);

    return stopPolling;
  }, [resumeId, stopPolling]);

  return { analysis, status, loading, error, triggerAnalysis };
}