import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, GraduationCap, Network, Users } from 'lucide-react';
import {
  ACADEMIC_BRANCHES,
  CAMPUS_COLLEGES_DEMO,
  HERO_MEDIA,
} from '../data/hirexData';
import { computeCampusEligibility } from '../utils/hirexLogic';
import ModuleMotionVideo from './ModuleMotionVideo';

const CGPA_OPTIONS = [
  { label: 'CGPA >= 7.0', value: 7.0 },
  { label: 'CGPA >= 7.5', value: 7.5 },
  { label: 'CGPA >= 8.0', value: 8.0 },
];

export default function CampusHiringShowcase() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [minCgpa, setMinCgpa] = useState<number>(7.5);
  const [campusImgFailed, setCampusImgFailed] = useState(false);

  const summary = useMemo(
    () => computeCampusEligibility(ACADEMIC_BRANCHES, minCgpa, selectedBranchId),
    [minCgpa, selectedBranchId],
  );

  return (
    <section
      id="chapter-08"
      className="relative scroll-mt-16 overflow-hidden border-t border-slate-800/70 bg-[#040811] py-10 sm:scroll-mt-20 sm:py-14"
    >
      {/* Architectural Twilight Campus Backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-25">
        {!campusImgFailed ? (
          <img
            src={HERO_MEDIA.campusBackdrop}
            alt="Modern glass and concrete university campus atrium at twilight"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setCampusImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_70%_35%,rgba(59,130,246,0.2),#040811_75%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040811] via-[#040811]/75 to-[#040811]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1360px] pl-12 pr-4 sm:pl-16 sm:pr-8 lg:pl-20 lg:pr-8">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-cyan-300">
              08. Campus Hiring Architecture
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
              One Recruiter. Multiple Colleges. Every Academic Branch.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Coordinate multi-campus drives across thousands of students—automating branch-level eligibility verification, assessment rounds, and real-time placement analytics.
            </p>
          </div>

          {/* CGPA Eligibility Threshold Segmented Control */}
          <div className="flex max-w-full flex-col gap-2 self-start">
            <span className="text-xs text-slate-400">Eligibility Rule Filter</span>
            <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-[#0A1120] p-1">
              {CGPA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMinCgpa(opt.value)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer sm:px-3.5 ${
                    minCgpa === opt.value
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Network Topology Flow: 1 Recruiter -> 3 Colleges -> 7 Branches -> Rounds -> Analytics */}
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-cyan-400/40 bg-[#0A1628]/95 p-5">
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span>Step 01</span>
              <Building2 className="h-4 w-4" />
            </div>
            <h3 className="font-display mt-3 text-lg font-bold text-white">One Recruiter Hub</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Publishes a unified campus requisition with role compensation, branch rules, and CGPA cutoffs.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <div className="flex items-center justify-between text-xs text-blue-300">
              <span>Step 02</span>
              <Network className="h-4 w-4" />
            </div>
            <h3 className="font-display mt-3 text-lg font-bold text-white">
              Multiple Colleges (3)
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {CAMPUS_COLLEGES_DEMO.map((c) => (
                <li key={c.name} className="truncate">
                  {c.name.replace(' (Demo)', '')} · {c.city}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <div className="flex items-center justify-between text-xs text-violet-300">
              <span>Step 03</span>
              <GraduationCap className="h-4 w-4" />
            </div>
            <h3 className="font-display mt-3 text-lg font-bold text-white">
              All Academic Branches
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              CE, IT, AI &amp; DS, ECE, Electrical, Mechanical, and Civil rosters verified simultaneously.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span>Step 04</span>
              <Users className="h-4 w-4" />
            </div>
            <h3 className="font-display mt-3 text-lg font-bold text-white">
              Rounds &amp; Placement Analytics
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Tracks eligibility filtering, technical rounds, AI screening, and final offers per branch.
            </p>
          </div>
        </div>

        {/* Live Multi-Campus Network Topology Video Reel */}
        <ModuleMotionVideo
          role="campus-hiring"
          title="Multi-Campus Network Topology"
          caption={`1 Recruiter Hub → 3 Colleges → ${summary.branches.length} Branches (${summary.eligibleStudents.toLocaleString()} eligible)`}
          contextData={{
            minCgpa,
            eligibilityRate: summary.eligibilityRate,
            totalStudents: summary.totalStudents,
            eligibleStudents: summary.eligibleStudents,
            selectedBranchName:
              selectedBranchId === 'all' ? 'all' : summary.branches[0]?.shortCode ?? 'all',
          }}
          heightClass="h-48 sm:h-52"
          className="mt-6"
        />

        {/* Academic Branch Filter Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedBranchId('all')}
            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedBranchId === 'all'
                ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                : 'border-slate-800 bg-[#0A1120] text-slate-300 hover:border-slate-700'
            }`}
          >
            All Branches (7)
          </button>
          {ACADEMIC_BRANCHES.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => setSelectedBranchId(branch.id)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedBranchId === branch.id
                  ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                  : 'border-slate-800 bg-[#0A1120] text-slate-300 hover:border-slate-700'
              }`}
            >
              {branch.name}
            </button>
          ))}
        </div>

        {/* Live KPI Summary Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <p className="text-xs text-slate-400">Total Cohort Students</p>
            <p
              data-testid="campus-total-students"
              className="font-display font-mono-tabular mt-2 text-3xl font-bold text-white"
            >
              {summary.totalStudents.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Across selected academic scope</p>
          </div>

          <div className="rounded-xl border border-cyan-400/35 bg-[#0A1628]/95 p-5">
            <p className="text-xs text-cyan-300">Eligible After CGPA Check</p>
            <p
              data-testid="campus-eligible-students"
              className="font-display font-mono-tabular mt-2 text-3xl font-bold text-white"
            >
              {summary.eligibleStudents.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-cyan-200">
              {summary.eligibilityRate}% match threshold (&ge; {minCgpa.toFixed(1)})
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <p className="text-xs text-slate-400">Round 2 Shortlisted</p>
            <p className="font-display font-mono-tabular mt-2 text-3xl font-bold text-blue-300">
              {summary.shortlistedStudents.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Cleared assessment + AI screen</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080F1D]/95 p-5">
            <p className="text-xs text-slate-400">Projected Offers</p>
            <p className="font-display font-mono-tabular mt-2 text-3xl font-bold text-violet-300">
              {summary.projectedOffers.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Tracked in TPO analytics ledger</p>
          </div>
        </div>

        {/* Academic Branch Breakdown Matrix */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-[#080F1D]/95 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <h3 className="font-display text-lg font-semibold text-white">
              Department &amp; Branch Eligibility Breakdown (Illustrative Demo Data)
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Instant TPO Verification Active
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {summary.branches.map((branch) => {
              const pct =
                branch.totalStudents > 0
                  ? Math.round((branch.eligibleStudents / branch.totalStudents) * 100)
                  : 0;
              return (
                <div
                  key={branch.id}
                  className="rounded-lg border border-slate-800/90 bg-[#050A14] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-sm font-semibold text-white">
                        {branch.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {branch.topSkills.join(' · ')}
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <p className="text-sm font-bold text-cyan-300">
                        {branch.eligibleStudents} / {branch.totalStudents}
                      </p>
                      <p className="text-[11px] text-slate-400">{pct}% eligible</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
                    <span>Shortlisted: {branch.shortlistedCount}</span>
                    <span>Projected Offers: {branch.offersProjected}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
