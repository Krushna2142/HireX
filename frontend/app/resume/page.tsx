/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase/Client';

type Analysis = {
  summary: string;
  skills: { category: string; items: string[] }[];
  roleRecommendations: { role: string; match: number; rationale: string }[];
  missingSkills: string[];
  learningPaths: { skill: string; resources: { title: string; url: string; type: 'free' | 'paid' }[] }[];
};

export default function ResumePage() {
  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const auth = getAuth(app);

  // 🔥 Real-time logged in user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, [auth]);

  const transformResultToAnalysis = (res: any): Analysis => {
    return {
      summary: res?.summary || 'Resume analysis complete',
      skills: res?.skillsCategorized
        ? Object.entries(res.skillsCategorized).map(([category, items]) => ({
            category,
            items: Array.isArray(items) ? items : [],
          }))
        : [],
      roleRecommendations: Array.isArray(res?.roleRecommendations)
        ? res.roleRecommendations
        : [],
      missingSkills: res?.missingSkills || [],
      learningPaths: [],
    };
  };

  const handleFile = useCallback(async (file: File | null) => {
    setStatus(null);
    setErrorMsg(null);
    setAnalysis(null);
    if (!file) return;

    const allowed =
      file.type.includes('pdf') ||
      file.type.includes('word') ||
      file.name.endsWith('.docx');

    if (!allowed) {
      setErrorMsg('Only PDF and DOCX files are supported.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setStatus('Uploading...');

      const fd = new FormData();
      fd.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/analyze', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.responseText);
          const normalized = transformResultToAnalysis(json);
          setAnalysis(normalized);
          setStatus('Analysis complete');
        } else {
          setErrorMsg(`Analysis failed (${xhr.status})`);
          setStatus(null);
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setErrorMsg('Network error');
        setStatus(null);
      };

      xhr.send(fd);
    } catch (err: any) {
      setUploading(false);
      setErrorMsg(err?.message ?? String(err));
      setStatus(null);
    }
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      await handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  const onUploadClick = useCallback(() => inputRef.current?.click(), []);
  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      await handleFile(file);
    },
    [handleFile]
  );
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  return (
    <section className="px-4 sm:px-6 lg:px-8 relative">
      {/* 🔥 Upload Popup */}
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-black border border-[var(--neon-1)] p-4 rounded-lg shadow-lg w-64 z-50">
          <div className="text-sm font-semibold mb-2">Uploading Resume...</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-[var(--neon-1)] h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-xs mt-1 text-right">{uploadProgress}%</div>
        </div>
      )}

      <div className="section-header">
        <h1 className="text-4xl font-extrabold tracking-tight">Resume Intelligence</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 card p-6">
          <label className="block text-sm font-medium text-white mb-2">
            Select resume (PDF / DOCX)
          </label>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`dropzone ${dragActive ? 'drag-active' : ''} p-6`}
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-white/90">
                Drag & drop your file here or
              </div>
              <button className="btn mt-4" onClick={onUploadClick}>
                Upload Resume
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={onFileChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              Error: {errorMsg}
            </div>
          )}
        </div>

        {/* 🔥 Right Side Account Panel (Improved + Real Data) */}
        <aside className="panel p-4 text-sm">
          <div className="text-[var(--text-muted)] text-xs">Signed in as</div>
          <div className="font-medium truncate">
            {user?.email || 'Not signed in'}
          </div>
          {user?.emailVerified && (
            <div className="text-xs text-green-400 mt-1">Verified</div>
          )}
        </aside>
      </div>
    </section>
  );
}
