// frontend/app/(protected)/resume-analysis/page.tsx
'use client';

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import api from '@/lib/axios';
import { useResumes, useAnalysis, type Resume, type ResumeAnalysis } from '@/hooks/useResumePolling';

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

const STATUS_CFG: Record<ResumeStatus, { color: string; bg: string; border: string; label: string }> = {
  uploaded: { color: 'text-[#60A5FA]', bg: 'bg-[rgba(96,165,250,0.1)]', border: 'border-[rgba(96,165,250,0.2)]', label: 'Queued' },
  processing: { color: 'text-[#FBBF24]', bg: 'bg-[rgba(251,191,36,0.1)]', border: 'border-[rgba(251,191,36,0.2)]', label: 'Analysing…' },
  analyzed: { color: 'text-[#34D399]', bg: 'bg-[rgba(52,211,153,0.1)]', border: 'border-[rgba(52,211,153,0.2)]', label: 'Complete' },
  failed: { color: 'text-[#F87171]', bg: 'bg-[rgba(248,113,113,0.1)]', border: 'border-[rgba(248,113,113,0.2)]', label: 'Failed' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFilename(fileName: string) {
  return fileName?.split('/').pop()?.replace(/^\d+-/, '') ?? fileName ?? 'resume';
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'name' in item) return String((item as { name?: unknown }).name ?? '');
    if (item && typeof item === 'object' && 'title' in item) return String((item as { title?: unknown }).title ?? '');
    return '';
  }).map((item) => item.trim()).filter(Boolean);
}

function getAnalysisJson(analysis: ExtendedAnalysis): Record<string, any> {
  return analysis.analysisJson && typeof analysis.analysisJson === 'object' ? analysis.analysisJson : {};
}

function getRawText(analysis: ExtendedAnalysis): string {
  const json = getAnalysisJson(analysis);
  return analysis.rawText ?? analysis.raw_text ?? analysis.rawTextPreview ?? json.rawTextPreview ?? json.rawText ?? '';
}

function getAtsScore(analysis: ExtendedAnalysis): number | null {
  const json = getAnalysisJson(analysis);
  const direct = analysis.atsScore ?? json.atsScore;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  const trajectory = analysis.trajectory ?? '';
  const match = trajectory.match(/ATS score:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function getScore(analysis: ExtendedAnalysis, key: 'sectionScore' | 'skillScore' | 'readabilityScore' | 'keywordScore'): number | null {
  const json = getAnalysisJson(analysis);
  const value = analysis[key] ?? json[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTopSkills(analysis: ExtendedAnalysis) {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.topSkills?.length ? analysis.topSkills : json.topSkills?.length ? json.topSkills : analysis.skills ?? json.skills);
}

function getIndustryTags(analysis: ExtendedAnalysis) {
  const json = getAnalysisJson(analysis);
  return toArray(analysis.industryTags?.length ? analysis.industryTags : json.industryTags);
}

function getPersonalInfo(analysis: ExtendedAnalysis): Record<string, any> {
  const json = getAnalysisJson(analysis);
  return analysis.personalInfo && typeof analysis.personalInfo === 'object' ? analysis.personalInfo : json.personalInfo && typeof json.personalInfo === 'object' ? json.personalInfo : {};
}

function getProjects(analysis: ExtendedAnalysis): string[] { return toArray(analysis.projects ?? getAnalysisJson(analysis).projects); }
function getEducation(analysis: ExtendedAnalysis): string[] { return toArray(analysis.education ?? getAnalysisJson(analysis).education); }
function getExperience(analysis: ExtendedAnalysis): string[] { return toArray(analysis.workExperience ?? getAnalysisJson(analysis).workExperience); }
function getCertifications(analysis: ExtendedAnalysis): string[] { return toArray(analysis.certifications ?? getAnalysisJson(analysis).certifications); }
function getStrengths(analysis: ExtendedAnalysis): string[] { return toArray(analysis.strengths ?? getAnalysisJson(analysis).strengths); }
function getWeaknesses(analysis: ExtendedAnalysis): string[] { return toArray(analysis.weaknesses ?? getAnalysisJson(analysis).weaknesses); }
function getImprovementTips(analysis: ExtendedAnalysis): string[] { return toArray(analysis.recommendations ?? getAnalysisJson(analysis).recommendations); }

function UploadZone({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setErr(null);
    if (!/\.(pdf|docx|doc)$/i.test(file.name)) { setErr('Only PDF, DOCX or DOC supported'); return; }
    if (file.size > 8 * 1024 * 1024) { setErr('File must be under 8 MB'); return; }
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
  }, [onUploaded]);

  return (
    <div>
      <label
        onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => { event.preventDefault(); setDrag(false); void handle(event.dataTransfer.files[0]); }}
        className={`flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${drag ? 'border-[rgba(167,139,250,0.6)] bg-[rgba(167,139,250,0.05)]' : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'}`}
      >
        {uploading ? (
          <>
            <span className="w-6 h-6 border-2 border-[rgba(167,139,250,0.3)] border-t-[#A78BFA] rounded-full animate-spin" />
            <span className="text-sm text-[rgba(226,232,240,0.68)]">Uploading…</span>
          </>
        ) : (
          <>
            <span className="text-4xl">📄</span>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#E2E8F0]">Drop resume here or <span className="text-[#A78BFA]">browse</span></p>
              <p className="text-xs text-[rgba(226,232,240,0.5)] mt-1">PDF · DOCX · DOC · max 8 MB</p>
            </div>
          </>
        )}
        <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(event) => void handle(event.target.files?.[0])} disabled={uploading} />
      </label>
      {err && <p className="text-xs text-[#F87171] mt-2">{err}</p>}
    </div>
  );
}

function ResumeListItem({ resume, isSelected, onSelect }: { resume: Resume; isSelected: boolean; onSelect: () => void }) {
  const cfg = STATUS_CFG[resume.status] ?? STATUS_CFG.uploaded;
  const name = getFilename(resume.fileName ?? '');
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all mb-2 flex items-center gap-3 ${isSelected ? 'border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.1)]' : 'border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[rgba(167,139,250,0.2)]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
        <span className="text-lg">📄</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#A78BFA]' : 'text-[#E2E8F0]'}`}>{name}</p>
        <p className="text-[11px] text-[rgba(226,232,240,0.5)] mt-0.5">{fmtDate(resume.createdAt)}</p>
      </div>
      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
        {resume.status === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse" />}
        {cfg.label}
      </span>
    </button>
  );
}

function ScoreCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4">
      <p className={`text-2xl font-bold font-mono leading-none ${color}`}>{value}</p>
      <p className="text-[10px] text-[rgba(226,232,240,0.5)] mt-2 uppercase tracking-wider font-bold">{label}</p>
    </div>
  );
}

function PillList({ title, items, color = 'text-[#A78BFA] bg-[rgba(167,139,250,0.1)] border-[rgba(167,139,250,0.2)]' }: { title: string; items: string[]; color?: string }) {
  if (!items.length) return null;
  return (
    <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
      <p className="text-xs font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${color}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function LineList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
      <p className="text-xs font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider mb-3">{title}</p>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item, index) => (
            <div key={`${item}-${index}`} className="border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.05)] rounded-lg p-3 text-sm text-[#E2E8F0] leading-relaxed">{item}</div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[rgba(226,232,240,0.3)]">{empty ?? 'No data detected.'}</p>
      )}
    </section>
  );
}

function AnalysisSummaryCard({ analysis, resumeName }: { analysis: ExtendedAnalysis; resumeName: string }) {
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
    <div className="grid gap-6">
      {/* Hero Score Card */}
      <section className="relative bg-gradient-to-br from-[rgba(52,211,153,0.1)] to-transparent border border-[rgba(52,211,153,0.2)] rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-bold text-[#34D399] uppercase tracking-wider">Analysis complete</span>
          <span className="ml-auto text-xs text-[rgba(226,232,240,0.5)]">{resumeName}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {atsScore !== null && <ScoreCard label="Resume ATS" value={`${atsScore}%`} color="text-[#34D399]" />}
          <ScoreCard label="Experience" value={`${analysis.experienceYears ?? 0}y`} color="text-[#A78BFA]" />
          <ScoreCard label="Level" value={analysis.experienceLevel ?? 'fresher'} color="text-[#60A5FA]" />
          <ScoreCard label="Skills" value={topSkills.length} color="text-[#F472B6]" />
        </div>
        {analysis.trajectory && <p className="text-sm text-[#E2E8F0] leading-relaxed mt-6">{analysis.trajectory}</p>}
      </section>

      {/* Breakdown Scores */}
      {(sectionScore !== null || skillScore !== null || readabilityScore !== null || keywordScore !== null) && (
        <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
          <p className="text-xs font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider mb-4">Score breakdown</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectionScore !== null && <ScoreCard label="Sections" value={`${sectionScore}%`} color="text-[#38BDF8]" />}
            {skillScore !== null && <ScoreCard label="Skills" value={`${skillScore}%`} color="text-[#A78BFA]" />}
            {readabilityScore !== null && <ScoreCard label="Readability" value={`${readabilityScore}%`} color="text-[#34D399]" />}
            {keywordScore !== null && <ScoreCard label="Keywords" value={`${keywordScore}%`} color="text-[#FBBF24]" />}
          </div>
        </section>
      )}

      <PillList title="Detected skills" items={topSkills} color="text-[#34D399] bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.2)]" />
      <PillList title="Industry tags" items={industryTags} color="text-[#60A5FA] bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.2)]" />

      {/* Personal Info */}
      <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
        <p className="text-xs font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider mb-4">Personal info detected</p>
        <div className="grid gap-3">
          {[
            ['Name', personalInfo.name],
            ['Email', personalInfo.email],
            ['Phone', personalInfo.phone],
            ['LinkedIn', personalInfo.linkedin],
            ['GitHub', personalInfo.github],
            ['Portfolio', personalInfo.portfolio],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-4 border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.05)] rounded-lg p-3 text-sm">
              <span className="text-[rgba(226,232,240,0.5)]">{label}</span>
              <strong className="text-[#E2E8F0] truncate">{value || 'Not detected'}</strong>
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

      {/* Raw Text */}
      <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-[rgba(226,232,240,0.5)] uppercase tracking-wider">Analysed text</p>
          <span className="text-[10px] text-[rgba(226,232,240,0.3)]">Extracted by Python AI service</span>
        </div>
        {rawText ? (
          <pre className="whitespace-pre-wrap max-h-80 overflow-y-auto border border-[rgba(255,255,255,0.07)] bg-black/20 rounded-lg p-4 text-xs text-[rgba(226,232,240,0.68)] leading-relaxed font-mono">{rawText}</pre>
        ) : (
          <p className="text-sm text-[rgba(226,232,240,0.3)]">No extracted text was returned. Re-run analysis after checking that the PDF is text-based, not only scanned images.</p>
        )}
      </section>

      {/* Recommendations CTA */}
      <section className="bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.2)] rounded-2xl p-6">
        <p className="text-sm font-bold text-[#A78BFA] mb-2">Job recommendations are separate</p>
        <p className="text-sm text-[rgba(226,232,240,0.68)] leading-relaxed mb-4">This page only shows resume intelligence. Recommended jobs and ATS score per job are shown in the Recommendations section.</p>
        <a href="/recommendations" className="inline-flex items-center px-4 py-2 rounded-lg bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.3)] text-[#A78BFA] text-sm font-bold hover:bg-[rgba(167,139,250,0.2)] transition-colors">
          Open Recommendations →
        </a>
      </section>
    </div>
  );
}

export default function ResumeAnalysisPage() {
  const { resumes, loading: loadingResumes, error: resumesError, reload } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { analysis, status, loading: analysing, error: analysisError, triggerAnalysis } = useAnalysis(selectedId);

  useEffect(() => {
    if (selectedId || resumes.length === 0) return;
    const preferred =
      resumes.find((resume) => resume.status === 'analyzed') ??
      resumes.find((resume) => resume.status === 'uploaded') ??
      resumes.find((resume) => resume.status === 'processing') ??
      resumes[0];
    setSelectedId(preferred.id);
  }, [resumes, selectedId]);

  const selectedResume = resumes.find((resume) => resume.id === selectedId);
  const currentStatus = (status as ResumeStatus | null) ?? selectedResume?.status;
  const canAnalyse = selectedResume?.status === 'uploaded' || selectedResume?.status === 'failed';

  const handleUploaded = async (id: string) => { await reload(); setSelectedId(id); };
  const handleAnalyse = async () => { if (selectedId) await triggerAnalysis(selectedId); await reload(); };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.07)] bg-[#0D1424] p-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Analysis</h1>
          <p className="text-sm text-[rgba(226,232,240,0.5)] mt-1">Upload · Queue · Analyse with HireX Python AI · Review extracted resume intelligence</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[rgba(226,232,240,0.5)]">
          <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_#34d399] animate-pulse" />
          Python AI connected
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-[rgba(255,255,255,0.07)] bg-[#0B1020] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[rgba(255,255,255,0.07)]">
            <UploadZone onUploaded={(id) => void handleUploaded(id)} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[rgba(226,232,240,0.3)] uppercase tracking-wider">Your resumes</span>
            {resumes.length > 0 && <span className="text-[10px] text-[rgba(226,232,240,0.3)]">{resumes.length}</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {loadingResumes && !resumes.length ? (
              [1, 2].map((item) => <div key={item} className="h-16 rounded-xl bg-[rgba(255,255,255,0.05)] mb-2 animate-pulse" />)
            ) : resumesError ? (
              <p className="text-xs text-[#F87171] px-2">{resumesError}</p>
            ) : resumes.length === 0 ? (
              <div className="text-center py-8 text-[rgba(226,232,240,0.3)] text-xs leading-relaxed">
                No resumes yet.<br />Upload your first one above.
              </div>
            ) : (
              resumes.map((resume) => (
                <ResumeListItem key={resume.id} resume={resume} isSelected={selectedId === resume.id} onSelect={() => setSelectedId(resume.id)} />
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selectedResume && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[rgba(226,232,240,0.3)] text-center">
              <span className="text-5xl">📄</span>
              <p className="text-lg font-medium">Select a resume to get started</p>
              <p className="text-sm">Or upload a new one from the left panel</p>
            </div>
          )}

          {selectedResume && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Resume Header & Actions */}
              <section className="bg-[#0D1424] border border-[rgba(255,255,255,0.07)] rounded-2xl p-6 mb-6 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-[#F8FAFC] truncate">{getFilename(selectedResume.fileName ?? '')}</p>
                  <p className="text-xs text-[rgba(226,232,240,0.5)] mt-1">Uploaded {fmtDate(selectedResume.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {currentStatus && (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-2 ${STATUS_CFG[currentStatus].color} ${STATUS_CFG[currentStatus].bg} ${STATUS_CFG[currentStatus].border}`}>
                      {currentStatus === 'processing' && <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse" />}
                      {STATUS_CFG[currentStatus].label}
                    </span>
                  )}
                  {canAnalyse && (
                    <button
                      type="button"
                      onClick={() => void handleAnalyse()}
                      disabled={analysing}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-bold text-sm transition-all ${analysing ? 'bg-[rgba(167,139,250,0.05)] border-[rgba(167,139,250,0.2)] text-[#A78BFA] cursor-not-allowed opacity-70' : 'bg-[rgba(167,139,250,0.1)] border-[rgba(167,139,250,0.3)] text-[#A78BFA] hover:bg-[rgba(167,139,250,0.2)]'}`}
                    >
                      {analysing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-[rgba(167,139,250,0.3)] border-t-[#A78BFA] rounded-full animate-spin" />
                          Starting…
                        </>
                      ) : (
                        <>
                          <span className="text-base">⚡</span>
                          {selectedResume.status === 'failed' ? 'Retry Analysis' : 'Analyse with Python AI'}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </section>

              {analysisError && (
                <div className="bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] rounded-xl p-4 mb-6">
                  <p className="text-sm text-[#F87171]">{analysisError}</p>
                </div>
              )}

              {currentStatus === 'processing' && !analysis && (
                <div className="bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.2)] rounded-xl p-5 flex items-center gap-4 mb-6">
                  <span className="w-5 h-5 border-2 border-[rgba(251,191,36,0.3)] border-t-[#FBBF24] rounded-full animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#FBBF24]">HireX Python AI is analysing your resume</p>
                    <p className="text-xs text-[rgba(251,191,36,0.6)] mt-1">Extracting skills, sections and ATS profile…</p>
                  </div>
                </div>
              )}

              {analysis && <AnalysisSummaryCard analysis={analysis as ExtendedAnalysis} resumeName={getFilename(selectedResume.fileName ?? '')} />}

              {selectedResume.status === 'uploaded' && !analysing && !analysis && (
                <div className="border-2 border-dashed border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.05)] rounded-2xl p-10 text-center">
                  <p className="text-4xl mb-3">⚡</p>
                  <p className="text-lg font-bold text-[#E2E8F0] mb-1">Resume queued for analysis</p>
                  <p className="text-sm text-[rgba(226,232,240,0.5)] mb-6 leading-relaxed max-w-md mx-auto">Click Analyse with Python AI to extract text, skills, projects, education and ATS profile.</p>
                  <button
                    type="button"
                    onClick={() => void handleAnalyse()}
                    disabled={analysing}
                    className="px-6 py-3 rounded-lg bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.3)] text-[#A78BFA] font-bold hover:bg-[rgba(167,139,250,0.2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}