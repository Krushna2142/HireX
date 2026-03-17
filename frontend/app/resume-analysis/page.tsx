'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';   // ← your axios instance with jc_token interceptor

interface Resume {
  id: string;
  file_name?: string;
  raw_text: string;
  created_at: string;
  analysis?: ResumeAnalysis;
}

interface ResumeAnalysis {
  skills: string[];
  experience_years: number;
  education: string[];
  summary: string;
  suggestions: string[];
  job_titles: string[];
}

interface JobRecommendation {
  id: string;
  title: string;
  company: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_min?: number;
  salary_max?: number;
  required_skills: string[];
  apply_url?: string;
  match_score?: number;
}

type Step = 'list' | 'analysing' | 'done';

export default function ResumeAnalysisPage() {
  const [resumes, setResumes]           = useState<Resume[]>([]);
  const [selected, setSelected]         = useState<Resume | null>(null);
  const [analysis, setAnalysis]         = useState<ResumeAnalysis | null>(null);
  const [recommendations, setRecs]      = useState<JobRecommendation[]>([]);
  const [step, setStep]                 = useState<Step>('list');
  const [loadingResumes, setLoadingRes] = useState(true);
  const [loadingRecs, setLoadingRecs]   = useState(false);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    api.get<Resume[]>('/api/resumes')
      .then(({ data }) => setResumes(data))
      .catch(() => setError('Failed to load resumes.'))
      .finally(() => setLoadingRes(false));
  }, []);

  const handleSelect = (resume: Resume) => {
    setSelected(resume);
    setAnalysis(null);
    setRecs([]);
    setStep('list');
    setError(null);
  };

  const handleAnalyse = async () => {
    if (!selected) return;
    setError(null);
    setStep('analysing');
    try {
      const { data } = await api.post<ResumeAnalysis>(`/api/resumes/${selected.id}/analyse`);
      setAnalysis(data);
      setStep('done');
      setLoadingRecs(true);
      const { data: recs } = await api.get<JobRecommendation[]>('/api/jobs/recommendations');
      setRecs(recs);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Analysis failed. Please try again.');
      setStep('list');
    } finally {
      setLoadingRecs(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '1.5rem 2rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>Resume Analysis</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Select a resume · run Groq AI · get personalised job recommendations
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 'calc(100vh - 89px)' }}>

        {/* ── Left: resume list ── */}
        <div style={{ background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', overflowY: 'auto' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Your Resumes ({resumes.length})
            </p>
          </div>

          {loadingResumes ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading...</div>
          ) : resumes.length === 0 ? (
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>No resumes uploaded yet</p>
              <a href="/resumes" style={{ fontSize: 13, color: 'var(--color-text-info)', textDecoration: 'none' }}>Upload your first resume →</a>
            </div>
          ) : resumes.map(resume => {
            const sel = selected?.id === resume.id;
            return (
              <button key={resume.id} onClick={() => handleSelect(resume)} style={{
                width: '100%', display: 'block', textAlign: 'left', padding: '1rem 1.25rem',
                background: sel ? 'var(--color-background-secondary)' : 'transparent',
                borderBottom: '0.5px solid var(--color-border-tertiary)',
                borderLeft: sel ? '3px solid var(--color-text-info)' : '3px solid transparent',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: sel ? '#E6F1FB' : 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={sel ? '#185FA5' : 'var(--color-text-secondary)'} strokeWidth="1"/>
                      <line x1="5" y1="5" x2="9" y2="5" stroke={sel ? '#185FA5' : 'var(--color-text-secondary)'} strokeWidth="1"/>
                      <line x1="5" y1="7.5" x2="10" y2="7.5" stroke={sel ? '#185FA5' : 'var(--color-text-secondary)'} strokeWidth="1"/>
                      <line x1="5" y1="10" x2="8" y2="10" stroke={sel ? '#185FA5' : 'var(--color-text-secondary)'} strokeWidth="1"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: sel ? 'var(--color-text-info)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resume.file_name ?? `Resume ${resume.id.slice(0, 6)}`}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{formatDate(resume.created_at)}</p>
                    {resume.analysis && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, padding: '2px 8px', background: '#EAF3DE', color: '#3B6D11', borderRadius: 20 }}>Analysed</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Right: analysis panel ── */}
        <div style={{ padding: '2rem', overflowY: 'auto' }}>

          {!selected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--color-text-secondary)' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
                <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="16" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="16" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <p style={{ fontSize: 15, margin: 0 }}>Select a resume from the left to get started</p>
            </div>
          )}

          {selected && step === 'list' && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {selected.file_name ?? `Resume ${selected.id.slice(0, 6)}`}
                </p>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Uploaded {formatDate(selected.created_at)}</p>
                <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '1rem', fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)', maxHeight: 140, overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
                  {selected.raw_text.slice(0, 400)}{selected.raw_text.length > 400 && '...'}
                </div>
              </div>

              {error && (
                <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '0.75rem 1rem', fontSize: 14, color: '#A32D2D', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}

              <button onClick={handleAnalyse} style={{ width: '100%', padding: '0.875rem', background: 'var(--color-text-primary)', color: 'var(--color-background-primary)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>
                Analyse with Groq AI
              </button>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 8 }}>
                Powered by Llama 3.3 70B · Takes 5–10 seconds
              </p>
            </div>
          )}

          {step === 'analysing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2.5px solid var(--color-border-tertiary)', borderTopColor: 'var(--color-text-primary)', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 15, color: 'var(--color-text-primary)', margin: 0, fontWeight: 500 }}>Analysing with Groq AI...</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Extracting skills, experience, and best-fit roles</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 'done' && analysis && (
            <div style={{ maxWidth: 760 }}>
              <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#639922' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Analysis complete</p>
                  <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 10px', background: '#EAF3DE', color: '#3B6D11', borderRadius: 20 }}>{selected?.file_name ?? 'Resume'}</span>
                </div>

                {analysis.summary && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</p>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)', margin: 0 }}>{analysis.summary}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.25rem' }}>
                  {[{ label: 'Experience', value: `${analysis.experience_years} yrs` }, { label: 'Skills', value: analysis.skills?.length ?? 0 }, { label: 'Target roles', value: analysis.job_titles?.length ?? 0 }].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '0.875rem', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {analysis.skills?.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {analysis.skills.map(skill => <span key={skill} style={{ fontSize: 12, padding: '4px 10px', background: '#E6F1FB', color: '#0C447C', borderRadius: 20 }}>{skill}</span>)}
                    </div>
                  </div>
                )}

                {analysis.suggestions?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions</p>
                    {analysis.suggestions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6, marginBottom: 8 }}>
                        <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: '#FAEEDA', color: '#854F0B', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>Matched Jobs</p>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{loadingRecs ? 'Finding matches...' : `${recommendations.length} recommendations`}</span>
                </div>

                {loadingRecs && (
                  <>
                    {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, background: 'var(--color-background-secondary)', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
                    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
                  </>
                )}

                {!loadingRecs && recommendations.map(job => {
                  const salary = formatSalary(job.salary_min, job.salary_max);
                  return (
                    <div key={job.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)' }}>{job.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{job.company} · {job.location}</p>
                        </div>
                        {job.match_score != null && (
                          <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 500, padding: '4px 10px', borderRadius: 20, background: job.match_score >= 80 ? '#EAF3DE' : job.match_score >= 60 ? '#FAEEDA' : 'var(--color-background-secondary)', color: job.match_score >= 80 ? '#3B6D11' : job.match_score >= 60 ? '#854F0B' : 'var(--color-text-secondary)' }}>
                            {job.match_score}% match
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        {[job.work_mode, job.employment_type?.replace('_',' '), salary].filter(Boolean).map(tag => (
                          <span key={tag} style={{ fontSize: 12, padding: '3px 8px', background: tag === salary ? '#EAF3DE' : 'var(--color-background-secondary)', color: tag === salary ? '#3B6D11' : 'var(--color-text-secondary)', borderRadius: 6 }}>{tag}</span>
                        ))}
                      </div>
                      {job.required_skills?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {job.required_skills.slice(0, 5).map(skill => {
                            const matched = analysis.skills?.some(s => s.toLowerCase() === skill.toLowerCase());
                            return <span key={skill} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: matched ? '#E6F1FB' : 'var(--color-background-secondary)', color: matched ? '#185FA5' : 'var(--color-text-secondary)' }}>{skill}</span>;
                          })}
                        </div>
                      )}
                      {job.apply_url && <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: 'var(--color-text-info)', textDecoration: 'none', fontWeight: 500 }}>Apply now →</a>}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => { setAnalysis(null); setStep('list'); setRecs([]); }} style={{ marginTop: '1.5rem', fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Select a different resume
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}