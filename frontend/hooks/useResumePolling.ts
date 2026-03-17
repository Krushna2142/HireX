/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
// hooks/useResumePolling.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/axios';

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

// ── useResumes ────────────────────────────────────────────────────────────────

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Resume[]>('/resumes');
      setResumes(data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { resumes, loading, error, reload: load };
}

// ── useAnalysis ───────────────────────────────────────────────────────────────

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

  const pollStatus = useCallback(async (id: string) => {
    try {
      const { data: resume } = await api.get<Resume>(`/resumes/${id}`);
      setStatus(resume.status);

      if (resume.status === 'analyzed') {
        stopPolling();
        const { data: a } = await api.get<Analysis>(`/resumes/${id}/analysis`);
        setAnalysis(a);
        setLoading(false);
      } else if (resume.status === 'failed') {
        stopPolling();
        setError('Analysis failed — please try again');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? (e as Error).message);
      stopPolling();
      setLoading(false);
    }
  }, [stopPolling]);

  const triggerAnalysis = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      await api.post(`/resumes/${id}/analyse`);
      setStatus('processing');
      pollRef.current = setInterval(() => { void pollStatus(id); }, 4_000);
    } catch (e: any) {
      setError(e.response?.data?.message ?? (e as Error).message);
      setLoading(false);
    }
  }, [pollStatus]);

  useEffect(() => {
    if (!resumeId) {
      setAnalysis(null);
      setStatus(null);
      return;
    }

    void api.get<Resume>(`/resumes/${resumeId}`).then(({ data: r }) => {
      setStatus(r.status);
      if (r.status === 'analyzed') {
        void api.get<Analysis>(`/resumes/${resumeId}/analysis`).then(({ data }) => setAnalysis(data));
      }
    }).catch(() => null);

    return stopPolling;
  }, [resumeId, stopPolling]);

  return { analysis, status, loading, error, triggerAnalysis };
}