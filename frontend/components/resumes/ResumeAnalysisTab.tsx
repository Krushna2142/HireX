//frontend/components/resumes/ResumeAnalysisTab.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/components/resumes/ResumeAnalysisTab.tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';
import {
  useResumes,
  useAnalysis,
  type Resume,
  type ResumeAnalysis,
} from '@/hooks/useResumePolling';

type ResumeStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed';

type ExtendedAnalysis = ResumeAnalysis & {
  raw_text?: string;
  rawTextPreview?: string;
  personalInfo?: Record<string, any>;
  workExperience?: any;
  education?: any;
  skills?: any;
  certifications?: any;
  projects?: any;
  missingCoreSections?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  atsScore?: number;
  analysisJson?: Record<string, any>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFilename(fileName: string): string {
  return fileName?.split('/').pop()?.replace(/^\d+-/, '') ?? fileName ?? 'resume';
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'name' in item) {
        return String((item as { name?: unknown }).name ?? '');
      }
      if (item && typeof item === 'object' && 'title' in item) {
        return String((item as { title?: unknown }).title ?? '');
      }
      return '';
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAnalysisJson(analysis: ExtendedAnalysis): Record<string, any> {
  return analysis.analysisJson && typeof analysis.analysisJson === 'object'
    ? analysis.analysisJson
    : {};
}

function getRawText(analysis: ExtendedAnalysis): string {
  const json = getAnalysisJson(analysis);

  return (
    analysis.rawText ??
    analysis.raw_text ??
    analysis.rawTextPreview ??
    json.rawTextPreview ??
    json.rawText ??
    ''
  );
}

function getAtsScore(analysis: ExtendedAnalysis): number | null {
  const json = getAnalysisJson(analysis);

  const direct = analysis.atsScore ?? json.atsScore;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;

  const trajectory = analysis.trajectory ?? '';
  const match = trajectory.match(/ATS score:\s*(\d+)/i);

  return match ? Number(match[1]) : null;
}

function getTopSkills(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);

  return toArray(
    analysis.topSkills?.length
      ? analysis.topSkills
      : json.topSkills?.length
        ? json.topSkills
        : analysis.skills ?? json.skills,
  );
}

function getIndustryTags(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.industryTags?.length ? analysis.industryTags : json.industryTags);
}

const STATUS_STYLES: Record<
  ResumeStatus,
  { color: string; bg: string; label: string }
> = {
  uploaded: {
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.1)',
    label: 'Queued',
  },
  processing: {
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.1)',
    label: 'Analysing',
  },
  analyzed: {
    color: '#34D399',
    bg: 'rgba(52,211,153,0.1)',
    label: 'Done',
  },
  failed: {
    color: '#F87171',
    bg: 'rgba(248,113,113,0.1)',
    label: 'Failed',
  },
};

function StatusBadge({ status }: { status: ResumeStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.uploaded;

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 7px',
        borderRadius: 20,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {status === 'processing' && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: s.color,
            animation: 'raPulse 1.2s ease infinite',
            display: 'inline-block',
          }}
        />
      )}
      {s.label}
    </span>
  );
}

function ResumeCard({
  resume,
  isSelected,
  onSelect,
  onAnalyse,
  analysing,
}: {
  resume: Resume;
  isSelected: boolean;
  onSelect: () => void;
  onAnalyse: () => void;
  analysing: boolean;
}) {
  const filename = getFilename(resume.fileName);
  const canTrigger = resume.status === 'uploaded' || resume.status === 'failed';

  return (
    <div
      onClick={onSelect}
      style={{
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
        border: `1px solid ${
          isSelected ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'
        }`,
        background: isSelected
          ? 'rgba(124,58,237,0.08)'
          : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 12, flexShrink: 0 }}>📄</span>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {filename}
            </span>
          </div>

          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
              paddingLeft: 18,
            }}
          >
            {formatDate(resume.createdAt)}
          </span>
        </div>

        <StatusBadge status={resume.status} />
      </div>

      {isSelected && canTrigger && (
        <div
          onClick={(event) => {
            event.stopPropagation();
            onAnalyse();
          }}
          style={{ marginTop: 8, paddingLeft: 18 }}
        >
          <button
            type="button"
            disabled={analysing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(124,58,237,0.4)',
              background: 'rgba(124,58,237,0.12)',
              color: '#A78BFA',
              fontSize: 11,
              fontWeight: 700,
              cursor: analysing ? 'not-allowed' : 'pointer',
              opacity: analysing ? 0.6 : 1,
              fontFamily: 'Sora, sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {analysing ? (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '2px solid rgba(167,139,250,0.3)',
                  borderTopColor: '#A78BFA',
                  animation: 'raSpin 0.7s linear infinite',
                  display: 'inline-block',
                }}
              />
            ) : (
              <span style={{ fontSize: 11 }}>⚡</span>
            )}
            {analysing
              ? 'Starting…'
              : resume.status === 'failed'
                ? 'Retry analysis'
                : 'Analyse with Python AI'}
          </button>
        </div>
      )}

      {isSelected && resume.status === 'processing' && (
        <div style={{ paddingLeft: 18, marginTop: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: '#FBBF24',
              animation: 'raPulse 1.5s ease infinite',
            }}
          >
            JobCrawler Python AI is reading your resume…
          </span>
        </div>
      )}

      {isSelected && resume.status === 'analyzed' && (
        <div style={{ paddingLeft: 18, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#34D399' }}>
            Analysis complete — open Recommendations for matched jobs
          </span>
        </div>
      )}
    </div>
  );
}

function UploadButton({ onUploaded }: { onUploaded: (resumeId: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!/\.(pdf|docx|doc)$/i.test(file.name)) {
        setUploadError('Only PDF, DOCX or DOC files are supported.');
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setUploadError('File must be under 8 MB.');
        return;
      }

      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const { data: resume } = await api.post<{ id: string }>(
          '/resumes/upload-raw',
          formData,
        );

        onUploaded(resume.id);
      } catch (err: any) {
        setUploadError(err.response?.data?.message ?? 'Upload failed');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onUploaded],
  );

  return (
    <div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '7px 0',
          borderRadius: 7,
          border: '1px dashed rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.02)',
          color: uploading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
          fontSize: 11,
          fontWeight: 600,
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'Sora, sans-serif',
        }}
      >
        {uploading ? (
          <>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.15)',
                borderTopColor: 'rgba(255,255,255,0.5)',
                animation: 'raSpin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
            Uploading…
          </>
        ) : (
          <>
            <span>↑</span> Upload PDF or DOCX
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(event) => {
            void handleFile(event);
          }}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {uploadError && (
        <p
          style={{
            fontSize: 10,
            color: '#F87171',
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {uploadError}
        </p>
      )}
    </div>
  );
}

function AnalysisSummary({ analysis }: { analysis: ExtendedAnalysis }) {
  const topSkills = getTopSkills(analysis);
  const industryTags = getIndustryTags(analysis);
  const atsScore = getAtsScore(analysis);
  const rawText = getRawText(analysis);

  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        border: '1px solid rgba(52,211,153,0.2)',
        background: 'rgba(52,211,153,0.05)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: '#34D399',
          marginBottom: 6,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Analysis complete
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: atsScore !== null ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 6,
          marginBottom: 8,
        }}
      >
        {atsScore !== null && (
          <div style={metricBoxStyle}>
            <strong style={{ color: '#34D399' }}>{atsScore}%</strong>
            <span>ATS</span>
          </div>
        )}

        <div style={metricBoxStyle}>
          <strong style={{ color: '#A78BFA' }}>
            {analysis.experienceYears ?? 0}y
          </strong>
          <span>Exp</span>
        </div>

        <div style={metricBoxStyle}>
          <strong style={{ color: '#60A5FA' }}>
            {analysis.experienceLevel ?? 'fresher'}
          </strong>
          <span>Level</span>
        </div>
      </div>

      {topSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {topSkills.slice(0, 8).map((skill) => (
            <span key={skill} style={skillPillStyle}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {industryTags.length > 0 && (
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 10,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
          }}
        >
          Industries: {industryTags.slice(0, 3).join(', ')}
        </p>
      )}

      {analysis.trajectory && (
        <p
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.42)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            margin: '0 0 8px',
          }}
        >
          {analysis.trajectory}
        </p>
      )}

      {rawText && (
        <details>
          <summary
            style={{
              cursor: 'pointer',
              color: '#93C5FD',
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            View analysed text
          </summary>

          <pre
            style={{
              whiteSpace: 'pre-wrap',
              maxHeight: 160,
              overflowY: 'auto',
              fontSize: 10,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(0,0,0,0.22)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              padding: 8,
              margin: 0,
            }}
          >
            {rawText}
          </pre>
        </details>
      )}

      <a
        href="/recommendations"
        style={{
          display: 'inline-flex',
          marginTop: 9,
          fontSize: 11,
          fontWeight: 800,
          color: '#A78BFA',
          textDecoration: 'none',
        }}
      >
        Open job recommendations →
      </a>
    </div>
  );
}

export default function ResumeAnalysisTab() {
  const { resumes, loading: resumesLoading, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    analysis,
    status,
    loading: analysing,
    error: analysisError,
    triggerAnalysis,
  } = useAnalysis(selectedId);

  const handleUploaded = useCallback(
    async (resumeId: string) => {
      await reload();
      setSelectedId(resumeId);
    },
    [reload],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.22)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Resume analysis
          </span>

          {resumes.length > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              {resumes.length} file{resumes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <UploadButton
          onUploaded={(id) => {
            void handleUploaded(id);
          }}
        />

        {resumesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 52,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  animation: 'raPulse 1.4s ease infinite',
                }}
              />
            ))}
          </div>
        ) : resumesError ? (
          <p style={{ fontSize: 11, color: '#F87171' }}>{resumesError}</p>
        ) : resumes.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 8px',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            No resumes yet.
            <br />
            Upload your first one above.
          </div>
        ) : (
          <div>
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                isSelected={selectedId === resume.id}
                onSelect={() => handleSelect(resume.id)}
                onAnalyse={handleAnalyse}
                analysing={analysing}
              />
            ))}
          </div>
        )}

        {analysisError && (
          <p
            style={{
              fontSize: 11,
              color: '#FCA5A5',
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              margin: 0,
            }}
          >
            {analysisError}
          </p>
        )}

        {status === 'processing' && !analysis && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid rgba(251,191,36,0.2)',
              background: 'rgba(251,191,36,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                flexShrink: 0,
                borderRadius: '50%',
                border: '2px solid rgba(251,191,36,0.3)',
                borderTopColor: '#FBBF24',
                animation: 'raSpin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FBBF24' }}>
                Python AI is analysing your resume
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(251,191,36,0.6)',
                  marginTop: 1,
                }}
              >
                Extracting skills, sections and ATS profile…
              </div>
            </div>
          </div>
        )}

        {analysis && <AnalysisSummary analysis={analysis as ExtendedAnalysis} />}
      </div>
    </>
  );
}

const metricBoxStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 8,
  padding: '7px 8px',
  display: 'grid',
  gap: 2,
  textAlign: 'center',
  fontSize: 10,
  color: 'rgba(255,255,255,0.35)',
};

const skillPillStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(52,211,153,0.1)',
  border: '1px solid rgba(52,211,153,0.2)',
  color: '#6EE7B7',
  fontWeight: 600,
};