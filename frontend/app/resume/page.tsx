/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useRef, useState } from 'react';

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const transformResultToAnalysis = (res: any): Analysis => {
    const summary =
      res?.preview
        ? String(res.preview)
        : Array.isArray(res?.sections)
        ? res.sections.slice(0, 2).map((s: any) => `${s.label}: ${s.text}`).join(' • ')
        : 'Resume analysis';
    const skillsArr =
      res?.skillsCategorized && typeof res.skillsCategorized === 'object'
        ? Object.entries(res.skillsCategorized).map(([category, items]) => ({
            category,
            items: Array.isArray(items) ? items : [],
          }))
        : [];
    const roleRecs =
      Array.isArray(res?.roleRecommendations)
        ? res.roleRecommendations.map((r: any) => ({
            role: String(r.role ?? ''),
            match: Number(r.match ?? 0),
            rationale: String(r.rationale ?? ''),
          }))
        : [];
    const learningPaths: Analysis['learningPaths'] = [];
    if (Array.isArray(res?.roleRecommendations)) {
      for (const r of res.roleRecommendations) {
        if (Array.isArray(r.resources)) {
          learningPaths.push({
            skill: String(r.role ?? 'Recommended Resources'),
            resources: r.resources.map((x: any) => ({
              title: String(x.title ?? ''),
              url: String(x.url ?? ''),
              type: (x.type === 'paid' ? 'paid' : 'free') as 'free' | 'paid',
            })),
          });
        }
      }
    }
    if (Array.isArray(res?.missingSkills)) {
      for (const m of res.missingSkills) {
        if (!learningPaths.find((lp) => lp.skill.toLowerCase() === String(m).toLowerCase())) {
          learningPaths.push({ skill: String(m), resources: [] });
        }
      }
    }
    return {
      summary,
      skills: skillsArr,
      roleRecommendations: roleRecs,
      missingSkills: Array.isArray(res?.missingSkills) ? res.missingSkills : [],
      learningPaths,
    };
  };

  const handleFile = useCallback(async (file: File | null) => {
    setStatus(null);
    setErrorMsg(null);
    setAnalysis(null);
    if (!file) return;

    const isPdf = file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    try {
      setStatus('Analyzing resume...');
      const fd = new FormData();
      fd.append('file', file);
      // Use your API route; replace if needed
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      let backendJson: any = null;
      let text: string | null = null;
      try {
        backendJson = await res.json();
      } catch {
        text = await res.text();
      }
      if (!res.ok) {
        const msg = (backendJson && (backendJson.error || backendJson.message)) || text || `Analysis failed (status ${res.status})`;
        throw new Error(msg);
      }
      const normalized = transformResultToAnalysis(backendJson);
      setAnalysis(normalized);
      setStatus('Analysis complete');
    } catch (err: any) {
      console.error('[ResumeAnalyze] error:', err);
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
      e.preventDefault(); e.stopPropagation(); setDragActive(false);
      const file = e.dataTransfer.files?.[0] ?? null;
      await handleFile(file);
    },
    [handleFile]
  );
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }, []);

  return (
   <section className="px-4 sm:px-6 lg:px-8">
      <div className="section-header">
        <h1 className="text-4xl font-extrabold tracking-tight">Resume Intelligence</h1>
      </div>
      <p className="text-[var(--text-muted)]">
        Upload your resume and receive AI-powered role recommendations, gap analysis, and personalized learning paths — presented in a futuristic UI.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 card p-6">
          <label className="block text-sm font-medium text-white mb-2">Select resume (PDF)</label>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`dropzone ${dragActive ? 'drag-active' : ''} p-6`}
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-white/90">Drag & drop your PDF here or</div>
              <button className="btn mt-4" onClick={onUploadClick} title="Upload resume">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload Resume
              </button>
            </div>
            <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={onFileChange} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          </div>

          {errorMsg && <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">Error: {errorMsg}</div>}

          {analysis && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 panel p-6">
                <div className="section-header"><h2 className="text-xl font-bold">Summary</h2></div>
                <div className="font-semibold text-lg mb-4">{analysis.summary}</div>

                <div className="section-header"><h3 className="text-lg font-bold">Role Recommendations</h3></div>
                <ul className="mt-2 space-y-2">
                  {analysis.roleRecommendations.map((r) => (
                    <li key={r.role} className="p-3 rounded-md border hover:border-[var(--neon-1)] transition">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{r.role}</div>
                        <div className="px-2 py-1 rounded badge-neon text-xs font-medium">{r.match}%</div>
                      </div>
                      {r.rationale && <div className="mt-1 text-xs text-[var(--text-muted)]">{r.rationale}</div>}
                    </li>
                  ))}
                </ul>

                <div className="section-header mt-6"><h3 className="text-lg font-bold">Skills</h3></div>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.skills.map((s) => (
                    <li key={s.category} className="rounded-md border p-2 hover:shadow-neon transition">
                      <div className="text-xs font-medium text-[var(--text-muted)]">{s.category}</div>
                      <div className="text-sm font-semibold">{(s.items || []).slice(0, 8).join(', ')}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Status</div>
                    <div className="font-medium">{status ?? (analysis ? 'Ready' : 'Idle')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Results</div>
                    <div className="font-semibold">{analysis ? (analysis.roleRecommendations?.length ?? 0) : 0}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setAnalysis(null); setErrorMsg(null); setStatus(null); }}
                  className="btn btn-secondary w-full mt-3"
                >
                  Reset
                </button>

                <div className="mt-4 text-xs text-[var(--text-muted)]">
                  <div className="mb-2">Tips</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>PDF-only. Use recent resume and remove images for best extraction.</li>
                    <li>Sign in to save history and get personalized recommendations.</li>
                    <li>Large files might take longer — keep under 5MB for fastest results.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </div>

        <aside className="panel p-6">
          <div className="text-sm text-[var(--text-muted)]">Signed in as</div>
          <div className="font-medium">you@example.com</div>
        </aside>
      </div>
    </section>
  );
}