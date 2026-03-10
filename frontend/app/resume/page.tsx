/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type Analysis = {
  summary: string;
  skills: { category: string; items: string[] }[];
  roleRecommendations: {
    role: string;
    match: number;
    rationale: string;
  }[];
  missingSkills: string[];
  learningPaths: {
    skill: string;
    resources: { title: string; url: string; type: 'free' | 'paid' }[];
  }[];
};

export default function ResumePage() {
  const [session, setSession] = useState<any>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const transformResultToAnalysis = (res: any): Analysis => ({
    summary: res?.summary || 'Resume uploaded successfully',
    skills: res?.skills || [],
    roleRecommendations: res?.roleRecommendations || [],
    missingSkills: res?.missingSkills || [],
    learningPaths: res?.learningPaths || [],
  });

  const handleFile = useCallback(
    async (file: File | null) => {
      setStatus(null);
      setErrorMsg(null);
      setAnalysis(null);

      if (!file || !session) {
        setErrorMsg('You must be logged in.');
        return;
      }

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

        const userId = session.user.id;
        const filePath = `${userId}/resume.${file.name.split('.').pop()}`;

        // ✅ 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // ✅ 2. Get Public URL
        const { data } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);

        const resumeUrl = data.publicUrl;

        // ✅ 3. Save URL in profiles table
        await supabase
          .from('profiles')
          .update({ resume_url: resumeUrl })
          .eq('id', userId);

        // ✅ 4. Send to your AI backend for analysis
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/analyze`, true);
        xhr.setRequestHeader(
          'Authorization',
          `Bearer ${session.access_token}`
        );

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round(
              (event.loaded / event.total) * 100
            );
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          setUploading(false);

          if (xhr.status === 200) {
            const json = JSON.parse(xhr.responseText);
            const normalized = transformResultToAnalysis(json);
            setAnalysis(normalized);
            setStatus('Upload successful');
          } else {
            setErrorMsg(
              `Upload failed (${xhr.status}) - ${xhr.responseText}`
            );
            setStatus(null);
          }
        };

        xhr.onerror = () => {
          setUploading(false);
          setErrorMsg('Network error');
          setStatus(null);
        };

        xhr.send(formData);
      } catch (err: any) {
        setUploading(false);
        setErrorMsg(err?.message ?? String(err));
        setStatus(null);
      }
    },
    [session, API_URL]
  );

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      await handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  const onUploadClick = useCallback(
    () => inputRef.current?.click(),
    []
  );

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
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-black border border-[var(--neon-1)] p-4 rounded-lg shadow-lg w-64 z-50">
          <div className="text-sm font-semibold mb-2">
            Uploading Resume...
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-[var(--neon-1)] h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-xs mt-1 text-right">
            {uploadProgress}%
          </div>
        </div>
      )}

      <div className="section-header">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Resume Intelligence
        </h1>
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

          {analysis && (
            <div className="mt-6 space-y-4">
              <div className="text-lg font-semibold">
                {analysis.summary}
              </div>
            </div>
          )}
        </div>

        <aside className="panel p-4 text-sm">
          <div className="text-(--text-muted) text-xs">
            Signed in as
          </div>
          <div className="font-medium truncate">
            {session?.user?.email || 'Not signed in'}
          </div>
        </aside>
      </div>
    </section>
  );
}