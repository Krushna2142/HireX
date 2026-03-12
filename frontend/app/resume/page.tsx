/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/resume/page.tsx
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
  role_recommendations: { role: string; match: number; matched_skills?: string[]; missing_skills?: string[] }[];
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const handleFile = useCallback(
    async (file: File | null) => {
      setStatus(null);
      setErrorMsg(null);
      setAnalysis(null);

      if (!file || !session) {
        setErrorMsg('You must be logged in.');
        return;
      }

      const allowed = file.type.includes('pdf') || file.type.includes('word') || file.name.endsWith('.docx');
      if (!allowed) {
        setErrorMsg('Only PDF and DOCX files are supported.');
        return;
      }

      try {
        setUploading(true);
        setUploadProgress(0);
        setStatus('Uploading & analyzing...');

        // 1. Upload to Supabase Storage (for backup/download)
        const userId = session.user.id;
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}_resume.${ext}`;

        await supabase.storage.from('resumes').upload(filePath, file, { upsert: true });

        // 2. Send file to ts-api → Python AI for real-time analysis
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/resumes/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
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
            try { detail = JSON.parse(xhr.responseText)?.message || detail; } catch {}
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
    [session, API_URL],
  );

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      await handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); e.stopPropagation(); setDragActive(false);
      await handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile],
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 relative">
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-black border border-[var(--neon-1)] p-4 rounded-lg shadow-lg w-64 z-50">
          <div className="text-sm font-semibold mb-2">Analyzing Resume...</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-[var(--neon-1)] h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="text-xs mt-1 text-right">{uploadProgress}%</div>
        </div>
      )}

      <div className="section-header">
        <h1 className="text-4xl font-extrabold tracking-tight">Resume Intelligence</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 card p-6">
          <label className="block text-sm font-medium text-white mb-2">Select resume (PDF / DOCX)</label>

          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            className={`dropzone ${dragActive ? 'drag-active' : ''} p-6`}
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-white/90">Drag & drop your file here or</div>
              <button className="btn mt-4" onClick={() => inputRef.current?.click()}>Upload Resume</button>
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={onFileChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
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

          {/* ── Real-time Analysis Results ─────────────────── */}
          {analysis && (
            <div className="mt-6 space-y-6">
              {/* Overall Score */}
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-black ${
                  analysis.overall_score >= 70 ? 'text-green-400' :
                  analysis.overall_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {analysis.overall_score}
                </div>
                <div>
                  <div className="text-lg font-bold text-white">ATS Score</div>
                  <div className="text-sm text-gray-400">
                    {analysis.ai_powered ? '🤖 AI-Powered Analysis' : '⚡ Local Analysis'}
                  </div>
                </div>
              </div>

              {analysis.summary && (
                <p className="text-sm text-gray-300">{analysis.summary}</p>
              )}

              {/* Skills Detected */}
              {analysis.skills_detected?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">
                    Skills Found ({analysis.skills_detected.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skills_detected.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {analysis.missing_skills && analysis.missing_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Missing Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missing_skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Role Recommendations */}
              {analysis.role_recommendations?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Role Fit</h3>
                  <div className="space-y-2">
                    {analysis.role_recommendations.map((r) => (
                      <div key={r.role} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{r.role}</div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                            <div className={`h-1.5 rounded-full ${
                              r.match >= 70 ? 'bg-green-500' : r.match >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} style={{ width: `${r.match}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{r.match}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-2">✅ Strengths</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {analysis.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-2">⚠️ Weaknesses</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {analysis.weaknesses.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">💡 Suggestions</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {analysis.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="panel p-4 text-sm">
          <div className="text-(--text-muted) text-xs">Signed in as</div>
          <div className="font-medium truncate">{session?.user?.email || 'Not signed in'}</div>

          {analysis && (
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Words</span>
                <span>{analysis.word_count || '—'}</span>
              </div>
              {analysis.jd_match_score !== undefined && analysis.jd_match_score > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">JD Match</span>
                  <span>{analysis.jd_match_score}%</span>
                </div>
              )}
              {analysis.section_scores && Object.entries(analysis.section_scores).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{k.replace('_', ' ')}</span>
                  <span>{v}%</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}