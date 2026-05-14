/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/app/(protected)/resume-analysis/page.tsx
'use client';

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
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
  languages?: any;
  missingCoreSections?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  atsScore?: number;
  sectionScore?: number;
  skillScore?: number;
  readabilityScore?: number;
  keywordScore?: number;
  analysisJson?: Record<string, any>;
};

const STATUS_CFG: Record<
  ResumeStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  uploaded: {
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.25)',
    label: 'Queued',
  },
  processing: {
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.25)',
    label: 'Analysing…',
  },
  analyzed: {
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
    label: 'Complete',
  },
  failed: {
    color: '#F87171',
    bg: 'rgba(248,113,113,0.12)',
    border: 'rgba(248,113,113,0.25)',
    label: 'Failed',
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFilename(value: string) {
  return (value?.split('/').pop() ?? value ?? 'resume').replace(/^\d+-/, '');
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
      if (item && typeof item === 'object' && 'description' in item) {
        return String((item as { description?: unknown }).description ?? '');
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

function getScore(
  analysis: ExtendedAnalysis,
  key: 'sectionScore' | 'skillScore' | 'readabilityScore' | 'keywordScore',
): number | null {
  const json = getAnalysisJson(analysis);
  const value = analysis[key] ?? json[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTopSkills(analysis: ExtendedAnalysis) {
  const json = getAnalysisJson(analysis);

  return toArray(
    analysis.topSkills?.length
      ? analysis.topSkills
      : json.topSkills?.length
        ? json.topSkills
        : analysis.skills ?? json.skills,
  );
}

function getIndustryTags(analysis: ExtendedAnalysis) {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.industryTags?.length ? analysis.industryTags : json.industryTags);
}

function getPersonalInfo(analysis: ExtendedAnalysis): Record<string, any> {
  const json = getAnalysisJson(analysis);

  return analysis.personalInfo && typeof analysis.personalInfo === 'object'
    ? analysis.personalInfo
    : json.personalInfo && typeof json.personalInfo === 'object'
      ? json.personalInfo
      : {};
}

function getProjects(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.projects ?? json.projects);
}

function getEducation(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.education ?? json.education);
}

function getExperience(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.workExperience ?? json.workExperience);
}

function getCertifications(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.certifications ?? json.certifications);
}

function getStrengths(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.strengths ?? json.strengths);
}

function getWeaknesses(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.weaknesses ?? json.weaknesses);
}

function getImprovementTips(analysis: ExtendedAnalysis): string[] {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.recommendations ?? json.recommendations);
}

function UploadZone({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;

      setErr(null);

      if (!/\.(pdf|docx|doc)$/i.test(file.name)) {
        setErr('Only PDF, DOCX or DOC supported');
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setErr('File must be under 8 MB');
        return;
      }

      setUploading(true);

      const fd = new FormData();
      fd.append('file', file);

      try {
        const { data } = await api.post<{ id: string }>('/resumes/upload-raw', fd);
        onUploaded(data.id);
      } catch (e: any) {
        setErr(e.response?.data?.message ?? 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          void handle(event.dataTransfer.files[0]);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '20px 16px',
          borderRadius: 12,
          cursor: uploading ? 'not-allowed' : 'pointer',
          border: `1.5px dashed ${
            drag ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.12)'
          }`,
          background: drag ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid rgba(167,139,250,0.3)',
                borderTopColor: '#A78BFA',
                animation: 'raSpin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Uploading…
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 24 }}>📄</span>

            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                Drop resume here or <span style={{ color: '#A78BFA' }}>browse</span>
              </p>

              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                PDF · DOCX · DOC · max 8 MB
              </p>
            </div>
          </>
        )}

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={(event) => void handle(event.target.files?.[0])}
          disabled={uploading}
        />
      </label>

      {err && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            color: '#F87171',
            lineHeight: 1.4,
          }}
        >
          {err}
        </p>
      )}
    </div>
  );
}

function ResumeListItem({
  resume,
  selected,
  onSelect,
}: {
  resume: Resume;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg = STATUS_CFG[resume.status] ?? STATUS_CFG.uploaded;
  const name = getFilename(resume.fileName ?? '');

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${
          selected ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.07)'
        }`,
        background: selected ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'Sora, sans-serif',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          flexShrink: 0,
          background: selected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📄
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            color: selected ? '#C4B5FD' : 'rgba(255,255,255,0.75)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>

        <p
          style={{
            margin: '2px 0 0',
            fontSize: 10,
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          {fmtDate(resume.createdAt)}
        </p>
      </div>

      <span
        style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 20,
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {resume.status === 'processing' && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: cfg.color,
              animation: 'raPulse 1.2s ease infinite',
              display: 'inline-block',
            }}
          />
        )}
        {cfg.label}
      </span>
    </button>
  );
}

function ScoreCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '13px 14px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 900,
          color,
          fontFamily: 'monospace',
          lineHeight: 1,
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: '5px 0 0',
          fontSize: 10,
          color: 'rgba(255,255,255,0.34)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontWeight: 800,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function PillList({
  title,
  items,
  color = '#A78BFA',
}: {
  title: string;
  items: string[];
  color?: string;
}) {
  if (!items.length) return null;

  return (
    <section style={panelStyle}>
      <p style={sectionTitleStyle}>{title}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 7,
              background: `${color}14`,
              border: `1px solid ${color}30`,
              color,
              fontWeight: 700,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function LineList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <section style={panelStyle}>
      <p style={sectionTitleStyle}>{title}</p>

      {items.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              style={{
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.025)',
                borderRadius: 10,
                padding: '9px 11px',
                color: 'rgba(226,232,240,0.70)',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            color: 'rgba(255,255,255,0.28)',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {empty ?? 'No data detected.'}
        </p>
      )}
    </section>
  );
}

function AnalysisSummaryCard({
  analysis,
  resumeName,
}: {
  analysis: ExtendedAnalysis;
  resumeName: string;
}) {
  const topSkills = getTopSkills(analysis);
  const industryTags = getIndustryTags(analysis);
  const atsScore = getAtsScore(analysis);
  const rawText = getRawText(analysis);
  const personalInfo = getPersonalInfo(analysis);
  const projects = getProjects(analysis);
  const education = getEducation(analysis);
  const experience = getExperience(analysis);
  const certifications = getCertifications(analysis);
  const strengths = getStrengths(analysis);
  const weaknesses = getWeaknesses(analysis);
  const tips = getImprovementTips(analysis);

  const sectionScore = getScore(analysis, 'sectionScore');
  const skillScore = getScore(analysis, 'skillScore');
  const readabilityScore = getScore(analysis, 'readabilityScore');
  const keywordScore = getScore(analysis, 'keywordScore');

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section
        style={{
          padding: '1.25rem',
          borderRadius: 16,
          border: '1px solid rgba(52,211,153,0.2)',
          background:
            'radial-gradient(circle at top left, rgba(52,211,153,0.10), transparent 36%), rgba(52,211,153,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#34D399',
              boxShadow: '0 0 6px #34D399',
            }}
          />

          <span
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#34D399',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Analysis complete
          </span>

          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {resumeName}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
          }}
        >
          {atsScore !== null && (
            <ScoreCard label="Resume ATS" value={`${atsScore}%`} color="#34D399" />
          )}

          <ScoreCard
            label="Experience"
            value={`${analysis.experienceYears ?? 0}y`}
            color="#A78BFA"
          />

          <ScoreCard
            label="Level"
            value={analysis.experienceLevel ?? 'fresher'}
            color="#60A5FA"
          />

          <ScoreCard
            label="Skills"
            value={topSkills.length}
            color="#F472B6"
          />
        </div>

        {analysis.trajectory && (
          <p
            style={{
              margin: '1rem 0 0',
              color: 'rgba(226,232,240,0.72)',
              lineHeight: 1.7,
              fontSize: 13,
            }}
          >
            {analysis.trajectory}
          </p>
        )}
      </section>

      {(sectionScore !== null ||
        skillScore !== null ||
        readabilityScore !== null ||
        keywordScore !== null) && (
        <section style={panelStyle}>
          <p style={sectionTitleStyle}>Score breakdown</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
            }}
          >
            {sectionScore !== null && (
              <ScoreCard label="Sections" value={`${sectionScore}%`} color="#38BDF8" />
            )}
            {skillScore !== null && (
              <ScoreCard label="Skills" value={`${skillScore}%`} color="#A78BFA" />
            )}
            {readabilityScore !== null && (
              <ScoreCard
                label="Readability"
                value={`${readabilityScore}%`}
                color="#34D399"
              />
            )}
            {keywordScore !== null && (
              <ScoreCard label="Keywords" value={`${keywordScore}%`} color="#FBBF24" />
            )}
          </div>
        </section>
      )}

      <PillList title="Detected skills" items={topSkills} color="#34D399" />
      <PillList title="Industry tags" items={industryTags} color="#60A5FA" />

      <section style={panelStyle}>
        <p style={sectionTitleStyle}>Personal info detected</p>

        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['Name', personalInfo.name],
            ['Email', personalInfo.email],
            ['Phone', personalInfo.phone],
            ['LinkedIn', personalInfo.linkedin],
            ['GitHub', personalInfo.github],
            ['Portfolio', personalInfo.portfolio],
          ].map(([label, value]) => (
            <div key={label} style={infoRowStyle}>
              <span>{label}</span>
              <strong>{value || 'Not detected'}</strong>
            </div>
          ))}
        </div>
      </section>

      <LineList title="Work experience detected" items={experience} />
      <LineList title="Projects detected" items={projects} />
      <LineList title="Education detected" items={education} />
      <LineList title="Certifications detected" items={certifications} />

      <LineList title="Strengths" items={strengths} empty="No strengths returned yet." />
      <LineList title="Weaknesses / gaps" items={weaknesses} empty="No major weaknesses detected." />
      <LineList title="Resume improvement tips" items={tips} empty="No improvement tips returned yet." />

      <section style={panelStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <p style={{ ...sectionTitleStyle, margin: 0 }}>Analysed text</p>

          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>
            Extracted by Python AI service
          </span>
        </div>

        {rawText ? (
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              maxHeight: 360,
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.24)',
              borderRadius: 12,
              padding: 14,
              color: 'rgba(226,232,240,0.72)',
              fontSize: 12,
              lineHeight: 1.75,
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {rawText}
          </pre>
        ) : (
          <p
            style={{
              margin: 0,
              color: 'rgba(255,255,255,0.35)',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            No extracted text was returned. Re-run analysis after checking that the
            PDF is text-based, not only scanned images.
          </p>
        )}
      </section>

      <section
        style={{
          ...panelStyle,
          borderColor: 'rgba(167,139,250,0.24)',
          background: 'rgba(167,139,250,0.055)',
        }}
      >
        <p style={{ ...sectionTitleStyle, color: '#C4B5FD' }}>
          Job recommendations are separate
        </p>

        <p
          style={{
            margin: '0 0 12px',
            color: 'rgba(226,232,240,0.62)',
            lineHeight: 1.7,
            fontSize: 13,
          }}
        >
          This page only shows resume intelligence. Recommended jobs and ATS score
          per job are shown in the Recommendations section.
        </p>

        <a
          href="/recommendations"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            padding: '9px 14px',
            textDecoration: 'none',
            background: 'rgba(124,58,237,0.18)',
            border: '1px solid rgba(167,139,250,0.34)',
            color: '#C4B5FD',
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          Open Recommendations →
        </a>
      </section>
    </div>
  );
}

export default function ResumeAnalysisPage() {
  const { resumes, loading: loadingResumes, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    analysis,
    status,
    loading: analysing,
    error: analysisError,
    triggerAnalysis,
  } = useAnalysis(selectedId);

  useEffect(() => {
    if (!selectedId && resumes.length > 0) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);

  const selectedResume = resumes.find((resume) => resume.id === selectedId);
  const currentStatus = (status as ResumeStatus | null) ?? selectedResume?.status;
  const canAnalyse =
    selectedResume?.status === 'uploaded' || selectedResume?.status === 'failed';

  const handleUploaded = async (id: string) => {
    await reload();
    setSelectedId(id);
  };

  const handleAnalyse = async () => {
    if (!selectedId) return;
    await triggerAnalysis(selectedId);
    await reload();
  };

  return (
    <>
      <style>{`
        @keyframes raSpin  { to { transform: rotate(360deg); } }
        @keyframes raPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes raFadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#080C14',
          fontFamily: "'Sora', sans-serif",
          color: '#E2E8F0',
        }}
      >
        <div
          style={{
            padding: '1.25rem 2rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0D1220',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                color: '#F1F5F9',
                letterSpacing: '-0.03em',
              }}
            >
              Resume Analysis
            </h1>

            <p
              style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              Upload · Queue · Analyse with JobCrawler Python AI · Review extracted resume intelligence
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(255,255,255,0.32)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#34D399',
                boxShadow: '0 0 5px #34D399',
                animation: 'raPulse 2s ease infinite',
                display: 'inline-block',
              }}
            />
            Python AI connected
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <aside
            style={{
              width: 300,
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: '#0B0F1C',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <UploadZone onUploaded={(id) => void handleUploaded(id)} />
            </div>

            <div
              style={{
                padding: '10px 14px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Your resumes
              </span>

              {resumes.length > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  {resumes.length}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 1rem' }}>
              {loadingResumes && !resumes.length ? (
                [1, 2].map((item) => (
                  <div
                    key={item}
                    style={{
                      height: 58,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      marginBottom: 6,
                      animation: 'raPulse 1.4s ease infinite',
                    }}
                  />
                ))
              ) : resumesError ? (
                <p style={{ fontSize: 11, color: '#F87171', padding: '0 4px' }}>
                  {resumesError}
                </p>
              ) : resumes.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: 12,
                    lineHeight: 1.7,
                  }}
                >
                  No resumes yet.
                  <br />
                  Upload your first one above.
                </div>
              ) : (
                resumes.map((resume) => (
                  <ResumeListItem
                    key={resume.id}
                    resume={resume}
                    selected={selectedId === resume.id}
                    onSelect={() => setSelectedId(resume.id)}
                  />
                ))
              )}
            </div>
          </aside>

          <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
            {!selectedResume && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 12,
                  color: 'rgba(255,255,255,0.2)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 48 }}>📄</span>
                <p style={{ fontSize: 14, margin: 0 }}>Select a resume to get started</p>
                <p style={{ fontSize: 12, margin: 0 }}>
                  Or upload a new one from the left panel
                </p>
              </div>
            )}

            {selectedResume && (
              <div style={{ maxWidth: 980, animation: 'raFadeIn 0.3s ease' }}>
                <section
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: '#0D1220',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: 900,
                        color: '#F1F5F9',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getFilename(selectedResume.fileName ?? '')}
                    </p>

                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.35)',
                      }}
                    >
                      Uploaded {fmtDate(selectedResume.createdAt)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    {currentStatus && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '5px 12px',
                          borderRadius: 20,
                          color: STATUS_CFG[currentStatus].color,
                          background: STATUS_CFG[currentStatus].bg,
                          border: `1px solid ${STATUS_CFG[currentStatus].border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {currentStatus === 'processing' && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: STATUS_CFG[currentStatus].color,
                              animation: 'raPulse 1.2s ease infinite',
                              display: 'inline-block',
                            }}
                          />
                        )}
                        {STATUS_CFG[currentStatus].label}
                      </span>
                    )}

                    {canAnalyse && (
                      <button
                        type="button"
                        onClick={() => void handleAnalyse()}
                        disabled={analysing}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '8px 18px',
                          borderRadius: 10,
                          border: '1px solid rgba(124,58,237,0.5)',
                          background: analysing
                            ? 'rgba(124,58,237,0.06)'
                            : 'rgba(124,58,237,0.15)',
                          color: '#A78BFA',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: analysing ? 'not-allowed' : 'pointer',
                          opacity: analysing ? 0.7 : 1,
                          transition: 'all 0.15s',
                          fontFamily: 'Sora, sans-serif',
                        }}
                      >
                        {analysing ? (
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '2px solid rgba(167,139,250,0.3)',
                              borderTopColor: '#A78BFA',
                              animation: 'raSpin 0.7s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 14 }}>⚡</span>
                        )}
                        {analysing
                          ? 'Starting…'
                          : selectedResume.status === 'failed'
                            ? 'Retry Analysis'
                            : 'Analyse with Python AI'}
                      </button>
                    )}
                  </div>
                </section>

                {analysisError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5' }}>
                      {analysisError}
                    </p>
                  </div>
                )}

                {currentStatus === 'processing' && !analysis && (
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderRadius: 16,
                      border: '1px solid rgba(251,191,36,0.2)',
                      background: 'rgba(251,191,36,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      marginBottom: '1.25rem',
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: '2.5px solid rgba(251,191,36,0.3)',
                        borderTopColor: '#FBBF24',
                        animation: 'raSpin 0.7s linear infinite',
                        display: 'inline-block',
                      }}
                    />

                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 900,
                          color: '#FBBF24',
                        }}
                      >
                        JobCrawler Python AI is analysing your resume
                      </p>

                      <p
                        style={{
                          margin: '3px 0 0',
                          fontSize: 12,
                          color: 'rgba(251,191,36,0.58)',
                        }}
                      >
                        Extracting text, skills, projects, experience and ATS profile.
                      </p>
                    </div>
                  </div>
                )}

                {analysis && (
                  <AnalysisSummaryCard
                    analysis={analysis as ExtendedAnalysis}
                    resumeName={getFilename(selectedResume.fileName ?? '')}
                  />
                )}

                {selectedResume.status === 'uploaded' && !analysing && !analysis && (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      borderRadius: 16,
                      border: '1px dashed rgba(167,139,250,0.2)',
                      background: 'rgba(124,58,237,0.03)',
                    }}
                  >
                    <p style={{ fontSize: 28, margin: '0 0 8px' }}>⚡</p>

                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: 'rgba(255,255,255,0.68)',
                        margin: '0 0 4px',
                      }}
                    >
                      Resume queued for analysis
                    </p>

                    <p
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.34)',
                        margin: '0 0 16px',
                        lineHeight: 1.7,
                      }}
                    >
                      Click Analyse with Python AI to extract text, skills,
                      projects, education and ATS profile.
                    </p>

                    <button
                      type="button"
                      onClick={() => void handleAnalyse()}
                      disabled={analysing}
                      style={{
                        border: '1px solid rgba(124,58,237,0.45)',
                        borderRadius: 12,
                        padding: '10px 16px',
                        background: 'rgba(124,58,237,0.16)',
                        color: '#C4B5FD',
                        fontWeight: 900,
                        cursor: analysing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Analyse with Python AI
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

const panelStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.07)',
  background: '#0D1220',
  borderRadius: 16,
  padding: '1rem',
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  color: 'rgba(255,255,255,0.42)',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const infoRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: 10,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.025)',
  borderRadius: 10,
  padding: '8px 10px',
  color: 'rgba(255,255,255,0.38)',
  fontSize: 12,
};