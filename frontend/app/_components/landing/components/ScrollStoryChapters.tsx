import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Check,
  ChevronRight,
  Cpu,
  FileSearch,
  GitBranch,
  Layers,
  Play,
  RotateCcw,
  ScanLine,
  Target,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  AI_INTERVIEW_EVALUATION,
  AI_INTERVIEW_TURNS,
  CANDIDATE_PRESETS,
  ECOSYSTEM_MODULES,
  FRAGMENTED_ARTIFACTS,
  HERO_MEDIA,
  JOB_PRESETS,
  RECRUITMENT_PIPELINE,
} from '../data/hirexData';
import { calculateAtsAnalysis } from '../utils/hirexLogic';
import MotionBackdropCanvas from './MotionBackdropCanvas';
import ModuleMotionVideo from './ModuleMotionVideo';

gsap.registerPlugin(ScrollTrigger);

const RESUME_STAGES = [
  { id: 'upload', step: '01', title: 'Resume Upload', desc: 'Ingests PDF, DOCX, or portfolio links with zero layout distortion.' },
  { id: 'parsing', step: '02', title: 'Structural Parsing', desc: 'Separates education, work tenure, projects, and technical summaries.' },
  { id: 'skills', step: '03', title: 'Skill Extraction', desc: 'Maps raw terminology into a normalized engineering and domain taxonomy.' },
  { id: 'experience', step: '04', title: 'Experience Identification', desc: 'Verifies production ownership, project impact, and tenure progression.' },
  { id: 'insights', step: '05', title: 'Candidate Insights', desc: 'Synthesizes strengths, role readiness, and growth gaps for recruiters.' },
];

export default function ScrollStoryChapters() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Chapter 01 state
  const [unifiedMode, setUnifiedMode] = useState(false);

  // Chapter 02 state
  const [activeModuleId, setActiveModuleId] = useState<string>('resume-analysis');
  const activeModule = useMemo(
    () => ECOSYSTEM_MODULES.find((m) => m.id === activeModuleId) ?? ECOSYSTEM_MODULES[0],
    [activeModuleId],
  );

  // Chapter 03 state
  const [resumeStageIdx, setResumeStageIdx] = useState(4);
  const [selectedCandidateId, setSelectedCandidateId] = useState(CANDIDATE_PRESETS[0].id);
  const activeCandidate = useMemo(
    () => CANDIDATE_PRESETS.find((c) => c.id === selectedCandidateId) ?? CANDIDATE_PRESETS[0],
    [selectedCandidateId],
  );

  // Chapter 04 state
  const [selectedJobId, setSelectedJobId] = useState(JOB_PRESETS[0].id);
  const activeJob = useMemo(
    () => JOB_PRESETS.find((j) => j.id === selectedJobId) ?? JOB_PRESETS[0],
    [selectedJobId],
  );
  const atsResult = useMemo(
    () => calculateAtsAnalysis(activeCandidate.skills, activeCandidate.experienceYears, activeJob),
    [activeCandidate, activeJob],
  );

  // Chapter 05 state
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const activeOpportunity =
    activeCandidate.matchedOpportunities[activeMatchIdx] ??
    activeCandidate.matchedOpportunities[0];

  // Chapter 06 state
  const [activePipelineIdx, setActivePipelineIdx] = useState(2);
  const activeStage = RECRUITMENT_PIPELINE[activePipelineIdx] ?? RECRUITMENT_PIPELINE[0];

  // Chapter 07 state
  const [visibleTurnCount, setVisibleTurnCount] = useState(2);
  const activeInterviewTurn =
    AI_INTERVIEW_TURNS[Math.max(0, visibleTurnCount - 1)] ?? AI_INTERVIEW_TURNS[0];
  const [aiImgFailed, setAiImgFailed] = useState(false);
  const [studioImgFailed, setStudioImgFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // Subtle entrance lift without setting opacity: 0 so cards never stay invisible after fast scroll or jump
      gsap.from('.ch2-node', {
        y: 16,
        stagger: 0.06,
        duration: 0.5,
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: '#chapter-02',
          start: 'top 85%',
          once: true,
        },
      });

      gsap.from('.ch6-stage', {
        y: 16,
        stagger: 0.06,
        duration: 0.5,
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: '#chapter-06',
          start: 'top 85%',
          once: true,
        },
      });
    }, root);

    const rafId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="bg-[#04070D]">
      {/* ================================================================= */}
      {/* CHAPTER 01 — FRAGMENTED HIRING                                    */}
      {/* ================================================================= */}
      <section
        id="chapter-01"
        className="relative scroll-mt-16 border-t border-slate-800/70 py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider text-cyan-300">
                01. Fragmented Hiring
              </p>
              <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Recruitment Shouldn&apos;t Be Fragmented.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-300">
                Modern hiring stalls when resumes live in email attachments, shortlists sit in static spreadsheets, and campus drives run over disconnected calendar threads.
              </p>
            </div>

            {/* Interactive State Switcher */}
            <div className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-lg border border-slate-800 bg-[#0B1222] p-1">
              <button
                type="button"
                onClick={() => setUnifiedMode(false)}
                className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  !unifiedMode
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fragmented State
              </button>
              <button
                type="button"
                onClick={() => setUnifiedMode(true)}
                className={`rounded-md px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  unifiedMode
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unified HireX Core
              </button>
            </div>
          </div>

          {/* Role Video: Silo Convergence Simulation */}
          <ModuleMotionVideo
            role="fragmented-hiring"
            title="Fragmented Hiring Convergence"
            caption={
              unifiedMode
                ? 'All 5 recruitment silos unified into HireX Core'
                : 'Resumes, job boards, CSVs, and calendars converging'
            }
            contextData={{ unifiedMode }}
            heightClass="h-48 sm:h-52"
            className="mt-6"
          />

          {/* Visual Convergence Stage */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            {FRAGMENTED_ARTIFACTS.map((item, idx) => (
              <div
                key={item.id}
                className={`ch1-artifact relative rounded-xl border p-5 transition-all duration-500 ${
                  unifiedMode
                    ? 'border-cyan-400/40 bg-[#0A1628]'
                    : 'border-slate-800/90 bg-[#080E1A]'
                }`}
                style={{
                  transform: unifiedMode
                    ? 'translateY(0px) rotate(0deg)'
                    : `translateY(${idx % 2 === 0 ? '-6px' : '10px'})`,
                }}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono-tabular">0{idx + 1}</span>
                  <span>{unifiedMode ? 'Synced to HireX' : item.source}</span>
                </div>
                <h3 className="font-display mt-3 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {unifiedMode
                    ? 'Normalized automatically into HireX candidate graphs and live stage ledgers.'
                    : item.friction}
                </p>
              </div>
            ))}
          </div>

          {/* Convergence Bridge Bar */}
          <div className="mt-8 rounded-xl border border-slate-800/80 bg-[#080F1D] p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-medium text-cyan-300">
                  {unifiedMode ? 'Ecosystem Active' : 'Convergence Target'}
                </p>
                <p className="font-display mt-1 text-xl font-semibold text-white">
                  {unifiedMode
                    ? 'All 5 workflows unified into a single AI-coordinated hiring ledger.'
                    : 'Click "Unified HireX Core" above to collapse silos into one intelligent pipeline.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUnifiedMode((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 whitespace-nowrap shrink-0 hover:bg-cyan-400/20 cursor-pointer"
              >
                {unifiedMode ? 'Inspect Fragmentation' : 'Unify Workflow'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 02 — HIREX INTELLIGENCE ECOSYSTEM                         */}
      {/* ================================================================= */}
      <section
        id="chapter-02"
        className="relative scroll-mt-16 overflow-hidden border-t border-slate-800/70 bg-[#050912] py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <MotionBackdropCanvas variant="neural" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-cyan-300">
              02. HireX Intelligence
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Six interconnected modules sharing one living talent graph.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Select any module below to trace how structured candidate insights flow from resume ingestion through ATS calibration, AI interviews, and campus drives.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left (Near Spine Line): Active Module Telemetry & Animated Talent Graph */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#091120]/95 p-7 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <span className="font-mono-tabular text-xs text-cyan-300">
                    Module {activeModule.index}
                  </span>
                  <span className="text-xs text-slate-400">
                    {activeModule.connectedIds.length} Direct Integrations
                  </span>
                </div>

                <h3 className="font-display mt-5 text-2xl font-bold text-white">
                  {activeModule.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {activeModule.summary}
                </p>

                <ModuleMotionVideo
                  role="ecosystem"
                  title="HireX Intelligence Graph"
                  caption={`Active signals from ${activeModule.shortLabel}`}
                  contextData={{
                    activeModuleIndex: ECOSYSTEM_MODULES.findIndex((m) => m.id === activeModule.id),
                    activeModuleTitle: activeModule.title,
                  }}
                  heightClass="h-44 sm:h-48"
                  className="mt-5"
                />

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Structured Inputs</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-200">
                      {activeModule.inputs.map((inp) => (
                        <li key={inp} className="flex items-center gap-2">
                          <ChevronRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{inp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Verified Outputs</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-200">
                      {activeModule.outputs.map((out) => (
                        <li key={out} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium text-slate-400">Connected Downstream Modules</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeModule.connectedIds.map((cid) => {
                    const target = ECOSYSTEM_MODULES.find((m) => m.id === cid);
                    if (!target) return null;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => setActiveModuleId(cid)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-cyan-200 whitespace-nowrap shrink-0 hover:border-cyan-400 cursor-pointer"
                      >
                        {target.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Interactive 6-Node Selector Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
              {ECOSYSTEM_MODULES.map((mod) => {
                const isSelected = mod.id === activeModule.id;
                const isConnected = activeModule.connectedIds.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModuleId(mod.id)}
                    className={`ch2-node group flex flex-col justify-between rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-[#0D1A2F]'
                        : isConnected
                        ? 'border-blue-400/40 bg-[#0A1324]'
                        : 'border-slate-800/90 bg-[#080E1A]/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between text-xs">
                      <span className="font-mono-tabular text-slate-400">{mod.index}</span>
                      <span
                        className={`text-[11px] font-medium ${
                          isSelected
                            ? 'text-cyan-300'
                            : isConnected
                            ? 'text-blue-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? 'Selected Module' : isConnected ? 'Connected Node' : 'Inspect'}
                      </span>
                    </div>
                    <h3 className="font-display mt-3 text-lg font-semibold text-white">
                      {mod.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {mod.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 03 — AI RESUME ANALYSIS                                   */}
      {/* ================================================================= */}
      <section
        id="chapter-03"
        className="relative scroll-mt-16 overflow-hidden border-t border-slate-800/70 py-10 sm:scroll-mt-20 sm:py-14"
      >
        {/* Layered Architectural Backdrop Image */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          {!aiImgFailed ? (
            <img
              src={HERO_MEDIA.aiResumeBackdrop}
              alt="Frosted obsidian glass layers refracting ice blue light"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setAiImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.16),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#04070D] via-[#04070D]/75 to-[#04070D]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider text-cyan-300">
                03. AI Resume Analysis
              </p>
              <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
                From raw PDF to structured candidate intelligence.
              </h2>
            </div>

            {/* Candidate Switcher */}
            <div className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-lg border border-slate-800 bg-[#0A1120] p-1">
              {CANDIDATE_PRESETS.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => setSelectedCandidateId(cand.id)}
                  className={`rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    cand.id === activeCandidate.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cand.name.replace(' (Demo Profile)', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive 5-Stage Sequence Bar */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {RESUME_STAGES.map((stage, idx) => {
              const active = idx === resumeStageIdx;
              const completed = idx < resumeStageIdx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setResumeStageIdx(idx)}
                  className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    active
                      ? 'border-cyan-400 bg-[#0D1B30]'
                      : completed
                      ? 'border-blue-500/35 bg-[#091223]'
                      : 'border-slate-800/80 bg-[#070C17] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-cyan-300">{stage.step}</span>
                    <ScanLine
                      className={`h-3.5 w-3.5 ${
                        active ? 'text-cyan-300' : completed ? 'text-blue-300' : 'text-slate-600'
                      }`}
                    />
                  </div>
                  <p className="font-display mt-2.5 text-sm font-semibold text-white">
                    {stage.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{stage.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Extracted Candidate Artifact View */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-6 lg:col-span-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs text-slate-400">Demo Resume Document</p>
                  <h3 className="font-display mt-1 text-xl font-bold text-white">
                    {activeCandidate.name}
                  </h3>
                </div>
                <FileSearch className="h-5 w-5 text-cyan-300" />
              </div>
              <ModuleMotionVideo
                role="resume-analysis"
                title="AI Resume Scanner"
                caption={`Scanning ${activeCandidate.name.replace(' (Demo Profile)', '')} · ${activeCandidate.skills.length} skills extracted`}
                contextData={{
                  candidateName: activeCandidate.name,
                  skills: activeCandidate.skills,
                  resumeStageIdx,
                }}
                heightClass="h-44 sm:h-48"
                className="mt-4"
              />
              <p className="mt-4 text-xs text-blue-300">{activeCandidate.education}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {activeCandidate.summary}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3.5 text-xs text-slate-400">
                <span>Active Inspection Stage</span>
                <span className="font-semibold text-cyan-300">
                  {RESUME_STAGES[resumeStageIdx].title}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0A1324]/95 p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <p className="text-sm font-semibold text-white">
                  Extracted Skills &amp; Candidate Insights
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setResumeStageIdx((prev) => (prev + 1) % RESUME_STAGES.length)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-400 cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                    Step Next Stage
                  </button>
                </div>
              </div>

              {/* Extracted Skill List (clean bordered text tokens, no pill overload) */}
              <div className="mt-5">
                <p className="text-xs font-medium text-slate-400">
                  Normalized Skill Entities ({activeCandidate.skills.length})
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeCandidate.skills.map((skill, idx) => (
                    <span
                      key={skill}
                      className={`rounded-md border px-2.5 py-1 font-mono-tabular text-xs transition-opacity duration-300 ${
                        resumeStageIdx >= 2 || idx < 3
                          ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200 opacity-100'
                          : 'border-slate-800 bg-slate-900/60 text-slate-500 opacity-45'
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience & Insights */}
              <div className="mt-6 space-y-3">
                {activeCandidate.extractedHighlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="rounded-lg border border-slate-800/90 bg-[#070C17] p-3.5"
                  >
                    <p className="text-xs font-semibold text-white">{highlight.label}</p>
                    <p className="mt-1 text-xs text-slate-300">{highlight.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 04 — ATS CHECKER                                          */}
      {/* ================================================================= */}
      <section
        id="chapter-04"
        className="relative scroll-mt-16 border-t border-slate-800/70 bg-[#050912] py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider text-cyan-300">
                04. ATS Checker
              </p>
              <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Transparent skill alignment before applications ever enter review.
              </h2>
            </div>

            {/* Job Target Selector */}
            <div className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-lg border border-slate-800 bg-[#0A1120] p-1">
              {JOB_PRESETS.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    job.id === activeJob.id
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {job.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Job Description Benchmark */}
            <div className="rounded-xl border border-slate-800 bg-[#080F1D] p-6 lg:col-span-5">
              <p className="text-xs text-slate-400">Target Requisition Benchmark</p>
              <h3 className="font-display mt-1 text-xl font-bold text-white">
                {activeJob.title}
              </h3>
              <p className="mt-1 text-xs text-blue-300">
                {activeJob.company} · {activeJob.department} · Min {activeJob.minExperience} yrs
              </p>

              <div className="mt-6">
                <p className="text-xs font-medium text-slate-400">Required Skills Matrix</p>
                <div className="mt-3 space-y-2">
                  {activeJob.requiredSkills.map((req) => {
                    const matched = atsResult.matchedRequired.includes(req);
                    return (
                      <div
                        key={req}
                        className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#060B15] px-3.5 py-2.5 text-xs"
                      >
                        <span className="font-medium text-slate-200">{req}</span>
                        {matched ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300">
                            <Check className="h-3.5 w-3.5" />
                            Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
                            <XCircle className="h-3.5 w-3.5" />
                            Missing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: ATS Score, Video Reel, Missing Skills & Recommendations */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0A1324] p-6 sm:p-7 lg:col-span-7">
              <ModuleMotionVideo
                role="ats-checker"
                title="ATS Alignment Simulation"
                caption={`${atsResult.score}% match against ${activeJob.title}`}
                contextData={{
                  score: atsResult.score,
                  matchedSkills: atsResult.matchedRequired,
                  missingSkills: atsResult.missingRequired,
                  jobTitle: activeJob.title,
                }}
                heightClass="h-44 sm:h-48"
                className="mb-5"
              />
              <div className="flex flex-col justify-between gap-6 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs text-slate-400">
                    Evaluating {activeCandidate.name} against {activeJob.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span
                      data-testid="ats-score-value"
                      className="font-display font-mono-tabular text-5xl font-bold text-white"
                    >
                      {atsResult.score}%
                    </span>
                    <span className="text-sm font-semibold text-cyan-300">
                      {atsResult.verdict}
                    </span>
                  </div>
                </div>

                {/* Animated Linear Alignment Meter */}
                <div className="w-full sm:w-56">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>ATS Alignment</span>
                    <span className="font-mono-tabular">{atsResult.matchedRequired.length}/{activeJob.requiredSkills.length} Core</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 transition-all duration-500"
                      style={{ width: `${atsResult.score}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-400">Missing Required Skills</p>
                  {atsResult.missingRequired.length === 0 ? (
                    <p className="mt-2.5 text-sm text-cyan-300">
                      All required competencies verified.
                    </p>
                  ) : (
                    <ul className="mt-2.5 space-y-2 text-xs text-amber-200">
                      {atsResult.missingRequired.map((miss) => (
                        <li
                          key={miss}
                          className="flex items-center gap-2 rounded-md border border-amber-400/25 bg-amber-400/5 px-3 py-2"
                        >
                          <Target className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                          <span>{miss}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">Tailored Recommendations</p>
                  <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-300">
                    {atsResult.recommendations.map((rec) => (
                      <li
                        key={rec}
                        className="rounded-md border border-slate-800 bg-[#070C17] p-3"
                      >
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 05 — SMART JOB MATCHING                                   */}
      {/* ================================================================= */}
      <section
        id="chapter-05"
        className="relative scroll-mt-16 border-t border-slate-800/70 py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-cyan-300">
              05. Smart Job Matching
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Candidate skills mapped directly to verified opportunities.
            </h2>
          </div>

          <div className="mt-7 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            {/* Left: Candidate Capability Vector */}
            <div className="rounded-xl border border-slate-800 bg-[#080F1D] p-6 lg:col-span-4">
              <p className="text-xs text-cyan-300">Candidate Vector</p>
              <h3 className="font-display mt-1 text-xl font-bold text-white">
                {activeCandidate.name}
              </h3>
              <p className="mt-1 text-xs text-slate-400">{activeCandidate.targetRole}</p>

              <div className="mt-5 space-y-2">
                {activeCandidate.skills.slice(0, 6).map((skill) => {
                  const isHighlighted = activeOpportunity.keyAlignments.includes(skill);
                  return (
                    <div
                      key={skill}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
                        isHighlighted
                          ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                          : 'border-slate-800/80 bg-[#060B15] text-slate-400'
                      }`}
                    >
                      <span>{skill}</span>
                      <span className="font-mono-tabular text-[11px]">
                        {isHighlighted ? 'Aligned' : 'Verified'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Animated Kinetic Job Matching Video Reel */}
            <div className="lg:col-span-4">
              <ModuleMotionVideo
                role="job-matching"
                title="Smart Job Matching Stream"
                caption={`${activeOpportunity.matchScore}% skill resonance with ${activeOpportunity.role}`}
                contextData={{
                  matchScore: activeOpportunity.matchScore,
                  company: activeOpportunity.company,
                  roleTitle: activeOpportunity.role,
                  alignedSkills: activeOpportunity.keyAlignments,
                }}
                heightClass="h-52 sm:h-56"
              />
            </div>

            {/* Right: Matched Opportunities List */}
            <div className="space-y-3 lg:col-span-4">
              {activeCandidate.matchedOpportunities.map((opp, idx) => {
                const selected = idx === activeMatchIdx;
                return (
                  <button
                    key={opp.role}
                    type="button"
                    onClick={() => setActiveMatchIdx(idx)}
                    className={`w-full rounded-xl border p-5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-cyan-400 bg-[#0D1A2F]'
                        : 'border-slate-800 bg-[#080F1D] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-blue-300">{opp.company}</p>
                        <h4 className="font-display mt-1 text-lg font-semibold text-white">
                          {opp.role}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {opp.location} · {opp.compensation}
                        </p>
                      </div>
                      <span className="font-mono-tabular text-xl font-bold text-cyan-300">
                        {opp.matchScore}%
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                      {opp.keyAlignments.map((k, kIdx) => (
                        <span key={k}>
                          {k}
                          {kIdx < opp.keyAlignments.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 06 — RECRUITMENT PIPELINE                                 */}
      {/* ================================================================= */}
      <section
        id="chapter-06"
        className="relative scroll-mt-16 border-t border-slate-800/70 bg-[#050912] py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider text-cyan-300">
                06. Recruitment Pipeline
              </p>
              <h2 className="font-display mt-2 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Every stage from job creation to offer release in lockstep.
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Select any stage below to inspect live funnel conversion (demo dataset)
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {RECRUITMENT_PIPELINE.map((stage, idx) => {
              const selected = idx === activePipelineIdx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActivePipelineIdx(idx)}
                  className={`ch6-stage flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-cyan-400 bg-[#0D1B30]'
                      : 'border-slate-800 bg-[#080F1D] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-cyan-300">{stage.step}</span>
                    <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="mt-5">
                    <p className="font-mono-tabular text-2xl font-bold text-white">
                      {stage.candidateCount.toLocaleString()}
                    </p>
                    <p className="font-display mt-1 text-sm font-semibold text-slate-100">
                      {stage.name}
                    </p>
                    <p className="mt-2 text-[11px] text-blue-300">{stage.conversionRate}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Animated Pipeline Funnel Conveyor Reel */}
          <ModuleMotionVideo
            role="recruitment-pipeline"
            title="Recruitment Pipeline Conveyor"
            caption={`Stage ${activeStage.step}: ${activeStage.name} · ${activeStage.candidateCount.toLocaleString()} records`}
            contextData={{
              activeStageIdx: activePipelineIdx,
              stageName: activeStage.name,
              stageCount: activeStage.candidateCount,
            }}
            heightClass="h-44 sm:h-48"
            className="mt-5"
          />

          {/* Stage Telemetry Detail Strip */}
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-[#091120] p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <Briefcase className="mt-0.5 h-5 w-5 text-cyan-300 shrink-0" />
              <div>
                <p className="text-xs text-cyan-300">
                  Stage {activeStage.step} · {activeStage.conversionRate}
                </p>
                <p className="font-display mt-1 text-lg font-semibold text-white">
                  {activeStage.name}: {activeStage.automationNote}
                </p>
              </div>
            </div>
            <div className="font-mono-tabular text-sm text-slate-300 whitespace-nowrap">
              {activeStage.candidateCount.toLocaleString()} active records
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* CHAPTER 07 — AI INTERVIEW                                         */}
      {/* ================================================================= */}
      <section
        id="chapter-07"
        className="relative scroll-mt-16 overflow-hidden border-t border-slate-800/70 py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <MotionBackdropCanvas variant="waves" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            {/* Left: Studio Room Visual + Evaluation Summary */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#080F1D] overflow-hidden lg:col-span-5">
              <div className="relative h-56 w-full overflow-hidden sm:h-64">
                {!studioImgFailed ? (
                  <img
                    src={HERO_MEDIA.recruiterBackdrop}
                    alt="Minimalist dark executive studio illuminated with cool cyan lighting"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => setStudioImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.22),#060B15_75%)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080F1D] via-[#080F1D]/40 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-cyan-300">07. AI Interview</p>
                    <h2 className="font-display text-2xl font-bold text-white">
                      Adaptive Screening Session
                    </h2>
                  </div>
                  <Bot className="h-6 w-6 text-cyan-300" />
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-relaxed text-slate-300">
                  Structured conversational interviews probe real architectural decisions rather than memorized trivia, handing human panels an auditable evaluation brief.
                </p>

                <div className="mt-6 border-t border-slate-800 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-400">Evaluation Summary</p>
                    <span className="text-xs font-semibold text-cyan-300">
                      {AI_INTERVIEW_EVALUATION.overallReadiness}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {AI_INTERVIEW_EVALUATION.rubricBreakdown.map((item) => (
                      <div
                        key={item.dimension}
                        className="rounded-lg border border-slate-800/80 bg-[#060B15] p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">{item.dimension}</span>
                          <span className="font-mono-tabular text-cyan-300">{item.score}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Session Progress */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0A1324] p-6 sm:p-7 lg:col-span-7">
              <div>
                <ModuleMotionVideo
                  role="ai-interview"
                  title="AI Interview Acoustic Session"
                  caption={`Active speaker: ${
                    activeInterviewTurn.speaker === 'ai'
                      ? 'HireX AI Interviewer'
                      : 'Candidate Response'
                  } · Turn ${visibleTurnCount}/${AI_INTERVIEW_TURNS.length}`}
                  contextData={{
                    speaker: activeInterviewTurn.speaker,
                    turnProgress: visibleTurnCount / AI_INTERVIEW_TURNS.length,
                  }}
                  heightClass="h-44 sm:h-48"
                  className="mb-5"
                />

                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Live Session Transcript Simulation
                      </p>
                      <p className="text-xs text-slate-400">
                        Step through the AI interview turns ({visibleTurnCount}/{AI_INTERVIEW_TURNS.length})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleTurnCount((prev) =>
                          prev < AI_INTERVIEW_TURNS.length ? prev + 1 : prev,
                        )
                      }
                      disabled={visibleTurnCount >= AI_INTERVIEW_TURNS.length}
                      className="inline-flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0 disabled:opacity-45 cursor-pointer"
                    >
                      <Play className="h-3 w-3" />
                      Next Turn
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTurnCount(1)}
                      aria-label="Reset interview simulation"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Transcript Turns */}
                <div className="mt-5 space-y-3.5">
                  {AI_INTERVIEW_TURNS.slice(0, visibleTurnCount).map((turn) => (
                    <div
                      key={turn.id}
                      className={`rounded-xl border p-4 ${
                        turn.speaker === 'ai'
                          ? 'border-cyan-400/30 bg-[#0D1A2F]'
                          : 'border-slate-800 bg-[#070C17]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                          {turn.speaker === 'ai' ? (
                            <Bot className="h-3.5 w-3.5 text-cyan-300" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-violet-300" />
                          )}
                          {turn.speaker === 'ai' ? 'HireX AI Interviewer' : 'Candidate Response'}
                        </span>
                        <span className="font-mono-tabular text-slate-400">
                          {turn.timestamp} · {turn.phase}
                        </span>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-slate-200">{turn.text}</p>
                      <p className="mt-2 text-[11px] text-cyan-300/90">
                        Signal Captured: {turn.signalNote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-300" />
                  Structured rubric synced to Recruitment Pipeline
                </span>
                <span className="font-mono-tabular">
                  {visibleTurnCount === AI_INTERVIEW_TURNS.length
                    ? 'Evaluation Ready'
                    : 'In Progress'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
