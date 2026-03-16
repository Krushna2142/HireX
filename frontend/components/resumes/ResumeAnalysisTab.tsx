/* eslint-disable @typescript-eslint/no-explicit-any */
// components/resume/ResumeAnalysisTab.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useResumes, useAnalysis }        from '@/hooks/useResumePolling';
import JobRecommendations                 from '@/components/recommendations/JobRecommendations';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

interface Resume {
  id:        string;
  fileName:  string;
  rawFile:   string;
  status:    ResumeStatus;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFilename(fileName: string): string {
  return fileName?.split('/').pop() ?? fileName ?? 'resume';
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ResumeStatus, { color: string; bg: string; label: string }> = {
  uploaded:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  label: 'Ready'      },
  processing: { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Analysing'  },
  analyzed:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Done'       },
  failed:     { color: '#F87171', bg: 'rgba(248,113,113,0.1)', label: 'Failed'     },
};

function StatusBadge({ status }: { status: ResumeStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.uploaded;
  return (
    <span style={{
      fontSize:     '10px',
      fontWeight:   600,
      padding:      '2px 7px',
      borderRadius: '20px',
      color:        s.color,
      background:   s.bg,
      border:       `1px solid ${s.color}40`,
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '4px',
      flexShrink:   0,
    }}>
      {status === 'processing' && (
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: s.color, animation: 'raPulse 1.2s ease infinite',
          display: 'inline-block',
        }} />
      )}
      {s.label}
    </span>
  );
}

// ── Resume card ───────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  isSelected,
  onSelect,
  onAnalyse,
  analysing,
}: {
  resume:     Resume;
  isSelected: boolean;
  onSelect:   () => void;
  onAnalyse:  () => void;
  analysing:  boolean;
}) {
  const filename = getFilename(resume.fileName);
  const canTrigger = resume.status === 'uploaded' || resume.status === 'failed';

  return (
    <div
      onClick={onSelect}
      style={{
        padding:      '10px',
        borderRadius: '8px',
        border:       `1px solid ${isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
        background:   isSelected ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
        cursor:       'pointer',
        transition:   'all 0.15s',
        marginBottom: '6px',
      }}
    >
      {/* Top row: filename + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span style={{ fontSize: '12px', flexShrink: 0 }}>📄</span>
            <span style={{
              fontSize:     '11px',
              fontWeight:   600,
              color:        'rgba(255,255,255,0.8)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {filename}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', paddingLeft: '18px' }}>
            {formatDate(resume.createdAt)}
          </span>
        </div>
        <StatusBadge status={resume.status} />
      </div>

      {/* Analyse button — only visible when selected + actionable */}
      {isSelected && canTrigger && (
        <div
          onClick={e => { e.stopPropagation(); onAnalyse(); }}
          style={{ marginTop: '8px', paddingLeft: '18px' }}
        >
          <button
            disabled={analysing}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '5px',
              padding:      '5px 10px',
              borderRadius: '6px',
              border:       '1px solid rgba(124,58,237,0.4)',
              background:   'rgba(124,58,237,0.12)',
              color:        '#A78BFA',
              fontSize:     '11px',
              fontWeight:   600,
              cursor:       analysing ? 'not-allowed' : 'pointer',
              opacity:      analysing ? 0.6 : 1,
              fontFamily:   'Sora, sans-serif',
              transition:   'all 0.15s',
            }}
          >
            {analysing ? (
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                border: '2px solid rgba(167,139,250,0.3)',
                borderTopColor: '#A78BFA',
                animation: 'raSpin 0.7s linear infinite',
                display: 'inline-block',
              }} />
            ) : (
              <span style={{ fontSize: '11px' }}>⚡</span>
            )}
            {analysing ? 'Starting…' : resume.status === 'failed' ? 'Retry analysis' : 'Analyse with Groq'}
          </button>
        </div>
      )}

      {/* Processing indicator */}
      {isSelected && resume.status === 'processing' && (
        <div style={{ paddingLeft: '18px', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#FBBF24', animation: 'raPulse 1.5s ease infinite' }}>
            Groq is reading your resume…
          </span>
        </div>
      )}

      {/* Analysed — success hint */}
      {isSelected && resume.status === 'analyzed' && (
        <div style={{ paddingLeft: '18px', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#34D399' }}>
            Analysis complete — recommendations below
          </span>
        </div>
      )}
    </div>
  );
}

// ── Upload button ─────────────────────────────────────────────────────────────

function UploadButton({
  onUploaded,
}: {
  onUploaded: (resumeId: string) => void;
}) {
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const fd    = new FormData();
    fd.append('file', file);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res   = await fetch(`${API}/resumes/upload-raw`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? 'Upload failed');
      }

      const resume = await res.json();
      onUploaded((resume as any).id);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [onUploaded]);

  return (
    <div>
      <label style={{
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          '6px',
        padding:      '7px 0',
        borderRadius: '7px',
        border:       '1px dashed rgba(255,255,255,0.12)',
        background:   'rgba(255,255,255,0.02)',
        color:        uploading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
        fontSize:     '11px',
        fontWeight:   500,
        cursor:       uploading ? 'not-allowed' : 'pointer',
        transition:   'all 0.15s',
        fontFamily:   'Sora, sans-serif',
      }}>
        {uploading ? (
          <>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.5)',
              animation: 'raSpin 0.7s linear infinite',
              display: 'inline-block',
            }} />
            Uploading…
          </>
        ) : (
          <>
            <span>↑</span>
            Upload PDF or DOCX
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={e => { void handleFile(e); }}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {uploadError && (
        <p style={{
          fontSize: '10px', color: '#F87171',
          marginTop: '4px', lineHeight: 1.4,
        }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ── Analysis summary card ─────────────────────────────────────────────────────

function AnalysisSummary({ analysis }: { analysis: any }) {
  const topSkills    = (analysis.topSkills    as string[] | undefined) ?? [];
  const industryTags = (analysis.industryTags as string[] | undefined) ?? [];

  return (
    <div style={{
      padding:      '10px',
      borderRadius: '8px',
      border:       '1px solid rgba(52,211,153,0.2)',
      background:   'rgba(52,211,153,0.05)',
      marginBottom: '10px',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 700,
        color: '#34D399', marginBottom: '6px',
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>
        Analysis complete
      </div>

      {/* Experience level + years */}
      <div style={{
        fontSize: '11px', color: 'rgba(255,255,255,0.6)',
        marginBottom: '6px',
      }}>
        {analysis.experienceYears}y exp · {analysis.experienceLevel}
        {industryTags.length > 0 && ` · ${industryTags.slice(0, 2).join(', ')}`}
      </div>

      {/* Top skills */}
      {topSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {topSkills.slice(0, 5).map((skill: string) => (
            <span key={skill} style={{
              fontSize:     '10px',
              padding:      '2px 6px',
              borderRadius: '4px',
              background:   'rgba(52,211,153,0.1)',
              border:       '1px solid rgba(52,211,153,0.2)',
              color:        '#6EE7B7',
              fontWeight:   500,
            }}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Trajectory */}
      {analysis.trajectory && (
        <p style={{
          fontSize: '10px',
          color:    'rgba(255,255,255,0.35)',
          fontStyle: 'italic',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {analysis.trajectory}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResumeAnalysisTab() {
  const { resumes, loading: resumesLoading, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    analysis,
    status,
    loading: analysing,
    error:   analysisError,
    triggerAnalysis,
  } = useAnalysis(selectedId);

  const handleUploaded = useCallback(async (resumeId: string) => {
    await reload();
    setSelectedId(resumeId);
  }, [reload]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const handleAnalyse = useCallback(() => {
    if (selectedId) void triggerAnalysis(selectedId);
  }, [selectedId, triggerAnalysis]);

  return (
    <>
      <style>{`
        @keyframes raSpin  { to { transform: rotate(360deg); } }
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '2px',
        }}>
          <span style={{
            fontSize:      '10px',
            fontWeight:    600,
            color:         'rgba(255,255,255,0.2)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Your resumes
          </span>
          {resumes.length > 0 && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
              {resumes.length} file{resumes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Upload */}
        <UploadButton onUploaded={id => { void handleUploaded(id); }} />

        {/* Resume list */}
        {resumesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2].map(i => (
              <div key={i} style={{
                height: '52px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                animation: 'raPulse 1.4s ease infinite',
              }} />
            ))}
          </div>
        ) : resumesError ? (
          <p style={{ fontSize: '11px', color: '#F87171' }}>{resumesError}</p>
        ) : resumes.length === 0 ? (
          <div style={{
            textAlign:  'center',
            padding:    '16px 8px',
            color:      'rgba(255,255,255,0.2)',
            fontSize:   '11px',
            lineHeight: 1.6,
          }}>
            No resumes yet.
            <br />Upload your first one above.
          </div>
        ) : (
          <div>
            {(resumes as Resume[]).map(r => (
              <ResumeCard
                key={r.id}
                resume={r}
                isSelected={selectedId === r.id}
                onSelect={() => handleSelect(r.id)}
                onAnalyse={handleAnalyse}
                analysing={analysing}
              />
            ))}
          </div>
        )}

        {/* Analysis error */}
        {analysisError && (
          <p style={{
            fontSize: '11px', color: '#FCA5A5',
            padding: '6px 8px', borderRadius: '6px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            margin: 0,
          }}>
            {analysisError}
          </p>
        )}

        {/* Processing state */}
        {status === 'processing' && !analysis && (
          <div style={{
            padding:      '10px',
            borderRadius: '8px',
            border:       '1px solid rgba(251,191,36,0.2)',
            background:   'rgba(251,191,36,0.05)',
            display:      'flex',
            alignItems:   'center',
            gap:          '8px',
          }}>
            <span style={{
              width: '12px', height: '12px', flexShrink: 0,
              borderRadius: '50%',
              border: '2px solid rgba(251,191,36,0.3)',
              borderTopColor: '#FBBF24',
              animation: 'raSpin 0.7s linear infinite',
              display: 'inline-block',
            }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#FBBF24' }}>
                Groq is analysing your resume
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(251,191,36,0.6)', marginTop: '1px' }}>
                Usually 5–15 seconds…
              </div>
            </div>
          </div>
        )}

        {/* Analysis result + recommendations */}
        {analysis && (
          <>
            <AnalysisSummary analysis={analysis} />
            <div style={{
              borderTop:  '1px solid rgba(255,255,255,0.05)',
              paddingTop: '10px',
            }}>
              <div style={{
                fontSize:      '10px',
                fontWeight:    600,
                color:         'rgba(255,255,255,0.2)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom:  '8px',
              }}>
                Recommended jobs
              </div>
              <JobRecommendations />
            </div>
          </>
        )}
      </div>
    </>
  );
}