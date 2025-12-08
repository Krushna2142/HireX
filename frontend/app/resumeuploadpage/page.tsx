/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
export const dynamic = 'force-dynamic';

import { useCallback, useState } from 'react';
import { useAuth } from '../../components/providers/AuthProvider';

type Analysis = {
  summary: string;
  skills: { category: string; items: string[] }[];
  roleRecommendations: { role: string; match: number; rationale: string }[];
  missingSkills: string[];
  learningPaths: { skill: string; resources: { title: string; url: string; type: 'free' | 'paid' }[] }[];
};

export default function ResumeUploadPage() {
  const { user, signInWithGoogle } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const transformResultToAnalysis = (res: any): Analysis => {
    const summary =
      res?.preview
        ? String(res.preview)
        : Array.isArray(res?.sections)
        ? res.sections
            .slice(0, 2)
            .map((s: any) => `${s.label}: ${s.text}`)
            .join(' • ')
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

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    setErrorMsg(null);
    setAnalysis(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type?.toLowerCase().includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('Only PDF files are supported.');
      return;
    }

    if (!user) {
      setStatus('Please sign in first.');
      return;
    }

    try {
      setStatus('Analyzing resume...');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', user?.uid || 'guest'); // associate analysis with the signed-in user

      // This calls the Next.js API proxy below (/app/api/analyze/route.ts).
      // That API forwards the multipart body to Node: /api/analyze/resume.
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });

      let backendJson: any = null;
      let text: string | null = null;
      try { backendJson = await res.json(); } catch { text = await res.text(); }

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
  }, [user]);

  return (
    <main className="page-gradient mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold">Resume Intelligence</h1>
      <p className="mt-2 text-muted-foreground">Upload your resume and get AI-powered role recommendations, gaps, and learning paths.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        {!user ? (
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">Please sign in to analyze resumes.</div>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              onClick={() => signInWithGoogle().catch(console.error)}
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-card-foreground">Select resume (PDF)</label>
            <input type="file" accept=".pdf,application/pdf" onChange={onFileChange} />
          </>
        )}

        {status && <div className="text-sm text-muted-foreground">{status}</div>}
        {errorMsg && <div className="text-sm text-destructive">{errorMsg}</div>}

        {analysis && (
          <div className="mt-4 rounded-md border p-4 space-y-3">
            <div className="font-medium">{analysis.summary}</div>

            {!!analysis.skills?.length && (
              <div>
                <div className="font-medium">Skills</div>
                <ul className="mt-2 list-disc pl-5">
                  {analysis.skills.map((s) => (
                    <li key={s.category}>
                      <span className="font-semibold">{s.category}:</span> {(s.items || []).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!analysis.roleRecommendations?.length && (
              <div>
                <div className="font-medium">Role Recommendations</div>
                <ul className="mt-2 list-disc pl-5">
                  {analysis.roleRecommendations.map((r) => (
                    <li key={r.role}>
                      {r.role} — {r.match}% match
                      {r.rationale && <div className="text-xs text-muted-foreground">{r.rationale}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="font-medium">Missing Skills</div>
              {analysis.missingSkills?.length ? (
                <ul className="mt-2 list-disc pl-5">
                  {analysis.missingSkills.map((m) => <li key={m}>{m}</li>)}
                </ul>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">No critical gaps detected for the top role.</div>
              )}
            </div>

            {!!analysis.learningPaths?.length && (
              <div>
                <div className="font-medium">Personalized Learning Paths</div>
                <ul className="mt-2 list-disc pl-5">
                  {analysis.learningPaths.map((lp) => (
                    <li key={lp.skill}>
                      <span className="font-semibold">{lp.skill}:</span>{' '}
                      {(lp.resources || []).map((r) => (
                        <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-primary underline mr-2">
                          {r.title} ({r.type})
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}