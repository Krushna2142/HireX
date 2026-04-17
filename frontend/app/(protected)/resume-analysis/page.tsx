'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { useResumes, useAnalysis, type Resume, type ResumeAnalysis } from '@/hooks/useResumePolling';
import useSWR from 'swr';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobRec {
  id:             string;
  title:          string;
  company:        string;
  location:       string | null;
  workMode:       string | null;
  employmentType: string | null;
  salaryMin:      number | null;
  salaryMax:      number | null;
  requiredSkills: string[];
  applyUrl:       string | null;
  matchScore?:    number;
  source:         'internal' | 'serpapi';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => api.get(url).then(r => r.data);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtSalary = (min: number | null, max: number | null) => {
  if (!min && !max) return null;
  const f = (n: number) => `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${f(min)}–${f(max)} PA`;
  return min ? `From ${f(min)}` : `Up to ${f(max!)}`;
};

const getFilename = (p: string) =>
  (p?.split('/').pop() ?? p ?? 'resume').replace(/^\d+-/, '');

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  uploaded:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  label: 'Ready to analyse' },
  processing: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)',  label: 'Analysing…'      },
  analyzed:   { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  label: 'Complete'        },
  failed:     { color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', label: 'Failed'          },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function UploadZone({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const [drag,      setDrag]      = useState(false);

  const handle = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setErr(null);
    if (!/\.(pdf|docx|doc)$/i.test(file.name)) { setErr('Only PDF, DOCX or DOC supported'); return; }
    if (file.size > 5 * 1024 * 1024) { setErr('File must be under 5 MB'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post<{ id: string }>('/resumes/upload-raw', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data.id);
    } catch (e: any) {
      setErr(e.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  return (
    <div>
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files[0]); }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '20px 16px', borderRadius: 12, cursor: uploading ? 'not-allowed' : 'pointer',
          border: `1.5px dashed ${drag ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.12)'}`,
          background: drag ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <>
            <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#A78BFA', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Uploading…</span>
          </>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
              <path d="M12 16V8m0-4l-4 4m4-4l4 4" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                Drop resume here or <span style={{ color: '#A78BFA' }}>browse</span>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>PDF · DOCX · DOC · max 5 MB</p>
            </div>
          </>
        )}
        <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
          onChange={e => void handle(e.target.files?.[0])} disabled={uploading} />
      </label>
      {err && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#F87171', lineHeight: 1.4 }}>{err}</p>}
    </div>
  );
}

function ResumeListItem({ resume, selected, onSelect }: {
  resume:   Resume;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg  = STATUS_CFG[resume.status] ?? STATUS_CFG.uploaded;
  const name = getFilename(resume.fileName ?? '');

  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10,
      border: `1px solid ${selected ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.07)'}`,
      background: selected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
      cursor: 'pointer', transition: 'all 0.15s', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* File icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.4)'} strokeWidth="1"/>
          <line x1="5" y1="5" x2="9" y2="5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
          <line x1="5" y1="7.5" x2="10" y2="7.5" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
          <line x1="5" y1="10" x2="8" y2="10" stroke={selected ? '#A78BFA' : 'rgba(255,255,255,0.3)'} strokeWidth="1"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: selected ? '#C4B5FD' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          {fmtDate(resume.createdAt)}
        </p>
      </div>

      {/* Status pill */}
      <span style={{
        flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {resume.status === 'processing' && (
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: 'raPulse 1.2s ease infinite', display: 'inline-block' }} />
        )}
        {cfg.label}
      </span>
    </button>
  );
}

function AnalysisSummaryCard({ analysis, resumeName }: { analysis: ResumeAnalysis; resumeName: string }) {
  return (
    <div style={{
      padding: '1.25rem', borderRadius: 12,
      border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.04)',
      marginBottom: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Analysis complete
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{resumeName}</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'Experience', value: `${analysis.experienceYears}y` },
          { label: 'Level',      value: analysis.experienceLevel       },
          { label: 'Skills',     value: analysis.topSkills?.length ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
            padding: '10px 12px', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#34D399', fontFamily: 'monospace' }}>{value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Top skills */}
      {(analysis.topSkills?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {analysis.topSkills.slice(0, 8).map(skill => (
              <span key={skill} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                color: '#6EE7B7', fontWeight: 500,
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Industry tags */}
      {(analysis.industryTags?.length ?? 0) > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Industries</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {analysis.industryTags.slice(0, 4).map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                color: '#93C5FD', fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.trajectory && (
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.6 }}>
          "{analysis.trajectory}"
        </p>
      )}
    </div>
  );
}

function RecommendationCard({ job, userSkills }: { job: JobRec; userSkills: string[] }) {
  const salary     = fmtSalary(job.salaryMin, job.salaryMax);
  const lowerUser  = userSkills.map(s => s.toLowerCase());

  return (
    <div style={{
      padding: '1rem 1.25rem', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{job.title}</p>
            {job.source === 'internal' && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)', fontWeight: 600 }}>Direct</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {job.company}{job.location ? ` · ${job.location}` : ''}{job.workMode ? ` · ${job.workMode}` : ''}
          </p>
        </div>
        {job.matchScore != null && job.matchScore > 0 && (
          <span style={{
            flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
            background: job.matchScore >= 80 ? 'rgba(52,211,153,0.12)' : job.matchScore >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(96,165,250,0.12)',
            color:      job.matchScore >= 80 ? '#34D399'                : job.matchScore >= 60 ? '#FBBF24'                : '#60A5FA',
            border:     `1px solid ${job.matchScore >= 80 ? 'rgba(52,211,153,0.25)' : job.matchScore >= 60 ? 'rgba(251,191,36,0.25)' : 'rgba(96,165,250,0.25)'}`,
          }}>
            {job.matchScore}% match
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
        {salary && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}>{salary}</span>}
        {job.employmentType && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>{job.employmentType.replace('_', ' ')}</span>}
      </div>

      {/* Skills — highlight matched ones */}
      {job.requiredSkills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {job.requiredSkills.slice(0, 6).map(skill => {
            const matched = lowerUser.includes(skill.toLowerCase());
            return (
              <span key={skill} style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: matched ? 'rgba(52,211,153,0.1)'  : 'rgba(255,255,255,0.04)',
                color:      matched ? '#6EE7B7'                : 'rgba(255,255,255,0.3)',
                border:     `1px solid ${matched ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
                fontWeight: matched ? 600 : 400,
              }}>
                {matched && '✓ '}{skill}
              </span>
            );
          })}
        </div>
      )}

      {job.applyUrl && (
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: 600,
          color: '#A78BFA', textDecoration: 'none',
        }}>
          Apply now →
        </a>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResumeAnalysisPage() {
  const { resumes, loading: loadingResumes, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { analysis, status, loading: analysing, error: analysisError, triggerAnalysis } = useAnalysis(selectedId);

  // Fetch recommendations — only after analysis is done
  const { data: recommendations, isLoading: loadingRecs } = useSWR<JobRec[]>(
    analysis ? '/jobs/recommendations' : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  // Auto-select first resume on load
  useEffect(() => {
    if (!selectedId && resumes.length > 0) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);

  const selectedResume = resumes.find(r => r.id === selectedId);
  const userSkills     = analysis?.topSkills ?? [];

  const handleUploaded = async (id: string) => {
    await reload();
    setSelectedId(id);
  };

  const canAnalyse = selectedResume?.status === 'uploaded' || selectedResume?.status === 'failed';

  return (
    <>
      <style>{`
        @keyframes raSpin  { to { transform: rotate(360deg); } }
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes raFadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* ── Top bar ── */}
        <div style={{
          padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0D1220', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>Resume Analysis</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Upload · Analyse with Gemini AI · Get personalised job recommendations
            </p>
          </div>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 5px #34D399', animation: 'raPulse 2s ease infinite', display: 'inline-block' }} />
            Live · syncs every 8s
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── LEFT PANEL: Resume list ── */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: '#0B0F1C',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Upload zone */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <UploadZone onUploaded={id => void handleUploaded(id)} />
            </div>

            {/* List header */}
            <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your resumes
              </span>
              {resumes.length > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{resumes.length}</span>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 1rem' }}>
              {loadingResumes && !resumes.length ? (
                [1, 2].map(i => (
                  <div key={i} style={{ height: 58, borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 6, animation: 'raPulse 1.4s ease infinite' }} />
                ))
              ) : resumesError ? (
                <p style={{ fontSize: 11, color: '#F87171', padding: '0 4px' }}>{resumesError}</p>
              ) : resumes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.2)', fontSize: 12, lineHeight: 1.7 }}>
                  No resumes yet.<br />Upload your first one above.
                </div>
              ) : (
                resumes.map(r => (
                  <ResumeListItem
                    key={r.id}
                    resume={r}
                    selected={selectedId === r.id}
                    onSelect={() => setSelectedId(r.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

            {/* Nothing selected */}
            {!selectedResume && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'rgba(255,255,255,0.2)' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
                  <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="16" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p style={{ fontSize: 14, margin: 0 }}>Select a resume to get started</p>
                <p style={{ fontSize: 12, margin: 0 }}>Or upload a new one from the left panel</p>
              </div>
            )}

            {/* Resume selected */}
            {selectedResume && (
              <div style={{ maxWidth: 820, animation: 'raFadeIn 0.3s ease' }}>

                {/* Resume header card */}
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#0D1220', marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getFilename(selectedResume.fileName ?? '')}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      Uploaded {fmtDate(selectedResume.createdAt)}
                    </p>
                  </div>

                  {/* Status + action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {(() => {
                      const cfg = STATUS_CFG[selectedResume.status];
                      return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 20, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {selectedResume.status === 'processing' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, animation: 'raPulse 1.2s ease infinite', display: 'inline-block' }} />}
                          {cfg.label}
                        </span>
                      );
                    })()}

                    {canAnalyse && (
                      <button
                        onClick={() => { if (selectedId) void triggerAnalysis(selectedId); }}
                        disabled={analysing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '8px 18px', borderRadius: 10,
                          border: '1px solid rgba(124,58,237,0.5)',
                          background: analysing ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.15)',
                          color: '#A78BFA', fontSize: 13, fontWeight: 700,
                          cursor: analysing ? 'not-allowed' : 'pointer',
                          opacity: analysing ? 0.7 : 1,
                          transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
                        }}
                      >
                        {analysing ? (
                          <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#A78BFA', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
                        ) : (
                          <span style={{ fontSize: 14 }}>⚡</span>
                        )}
                        {analysing ? 'Starting…' : selectedResume.status === 'failed' ? 'Retry Analysis' : 'Analyse with Gemini'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Error */}
                {analysisError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>{analysisError}</p>
                  </div>
                )}

                {/* Processing state */}
                {selectedResume.status === 'processing' && !analysis && (
                  <div style={{
                    padding: '1.25rem 1.5rem', borderRadius: 14,
                    border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)',
                    display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem',
                  }}>
                    <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: '50%', border: '2.5px solid rgba(251,191,36,0.3)', borderTopColor: '#FBBF24', animation: 'raSpin 0.7s linear infinite', display: 'inline-block' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FBBF24' }}>Gemini is analysing your resume</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(251,191,36,0.5)' }}>Usually 5–15 seconds · page updates automatically</p>
                    </div>
                  </div>
                )}

                {/* Analysis complete */}
                {analysis && (
                  <>
                    <AnalysisSummaryCard
                      analysis={analysis}
                      resumeName={getFilename(selectedResume.fileName ?? '')}
                    />

                    {/* Job recommendations */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
                          Matched Jobs
                        </p>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {loadingRecs ? 'Finding matches…' : `${recommendations?.length ?? 0} recommendations`}
                        </span>
                      </div>

                      {loadingRecs && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 10, background: 'rgba(255,255,255,0.04)', animation: 'raPulse 1.4s ease infinite' }} />)}
                        </div>
                      )}

                      {!loadingRecs && (!recommendations || recommendations.length === 0) && (
                        <div style={{ padding: '2rem', textAlign: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                            No matches found yet — jobs sync every 30 minutes
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recommendations?.map(job => (
                          <RecommendationCard key={job.id} job={job} userSkills={userSkills} />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Not analysed yet — prompt */}
                {selectedResume.status === 'uploaded' && !analysing && (
                  <div style={{
                    padding: '2rem', textAlign: 'center', borderRadius: 14,
                    border: '1px dashed rgba(167,139,250,0.2)', background: 'rgba(124,58,237,0.03)',
                  }}>
                    <p style={{ fontSize: 24, margin: '0 0 8px' }}>⚡</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
                      Ready to analyse
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>
                      Click the button above to extract your skills and get job recommendations
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
