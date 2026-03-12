
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useRef, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';

type Analysis = {
  overall_score: number;
  format_score?: number;
  content_score?: number;
  keywords_score?: number;
  skills_detected: string[];
  missing_skills?: string[];
  role_recommendations: {
    role: string;
    match: number;
    matched_skills?: string[];
    missing_skills?: string[];
  }[];
  section_scores?: Record<string, number>;
  format_checks?: Record<string, boolean>;
  suggestions: string[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  word_count?: number;
  jd_match_score?: number;
  ai_powered?: boolean;
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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      setStatus(null);
      setErrorMsg(null);
      setAnalysis(null);

      if (!file) {
        setErrorMsg('Please select a file.');
        return;
      }

      if (!session) {
        setErrorMsg('You must be logged in.');
        return;
      }

      const allowed =
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.docx') ||
        file.type === 'application/pdf';

      if (!allowed) {
        setErrorMsg('Only PDF and DOCX files are supported.');
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);
        setStatus('Uploading & analyzing...');

        // Upload to Supabase storage
        const userId = session.user.id;
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}_resume.${ext}`;

        await supabase.storage
          .from('resumes')
          .upload(filePath, file, { upsert: true });

        // Always fetch latest token
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error('Authentication token missing');
        }

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        xhr.open('POST', `${API_URL}/resumes/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(
              Math.round((event.loaded / event.total) * 100)
            );
          }
        };

        xhr.onload = () => {
          setUploading(false);

          if (xhr.status === 200 || xhr.status === 201) {
            const json = JSON.parse(xhr.responseText);
            const result = json.analysis || json;

            setAnalysis(result);
            setStatus('Analysis complete ✅');
          } else {
            let detail = 'Upload failed';

            try {
              detail = JSON.parse(xhr.responseText)?.message || detail;
            } catch {}

            setErrorMsg(`${detail} (${xhr.status})`);
            setStatus(null);
          }
        };

        xhr.onerror = () => {
          setUploading(false);
          setErrorMsg('Network error — check your connection');
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

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      await handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 relative">
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-black border border-[var(--neon-1)] p-4 rounded-lg shadow-lg w-64 z-50">
          <div className="text-sm font-semibold mb-2">Analyzing Resume...</div>

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
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            className={`dropzone ${dragActive ? 'drag-active' : ''} p-6`}
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-white/90">
                Drag & drop your file here or
              </div>

              <button
                className="btn mt-4"
                onClick={() => inputRef.current?.click()}
              >
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

          {status && !errorMsg && (
            <div className="mt-4 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
              {status}
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-black text-green-400">
                  {analysis.overall_score}
                </div>

                <div>
                  <div className="text-lg font-bold text-white">ATS Score</div>
                  <div className="text-sm text-gray-400">
                    {analysis.ai_powered
                      ? '🤖 AI-Powered Analysis'
                      : '⚡ Local Analysis'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="panel p-4 text-sm">
          <div className="text-gray-400 text-xs">Signed in as</div>
          <div className="font-medium truncate">
            {session?.user?.email || 'Not signed in'}
          </div>
        </aside>
      </div>
    </section>
  );
}

