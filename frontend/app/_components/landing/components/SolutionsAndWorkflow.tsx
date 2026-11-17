import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Briefcase, GraduationCap, UserCheck } from 'lucide-react';
import { USER_SOLUTIONS } from '../data/hirexData';
import ModuleMotionVideo from './ModuleMotionVideo';

interface SolutionsAndWorkflowProps {
  onOpenGetStarted: () => void;
}

const PERSONA_ICONS = {
  candidate: UserCheck,
  recruiter: Briefcase,
  college: GraduationCap,
} as const;

export default function SolutionsAndWorkflow({ onOpenGetStarted }: SolutionsAndWorkflowProps) {
  const [activePersonaId, setActivePersonaId] = useState<'candidate' | 'recruiter' | 'college'>('candidate');

  const activePersona = useMemo(
    () => USER_SOLUTIONS.find((p) => p.id === activePersonaId) ?? USER_SOLUTIONS[0],
    [activePersonaId],
  );

  return (
    <section
      id="solutions"
      className="relative scroll-mt-16 border-t border-slate-800/70 bg-[#050912] py-10 sm:scroll-mt-20 sm:py-14"
    >
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        {/* Header + Persona Selector */}
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-cyan-300">
              Solutions &amp; Interactive Workflow
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Tailored intelligence for every side of the hiring table.
            </h2>
          </div>

          {/* Segmented Role Switcher */}
          <div
            role="tablist"
            aria-label="Select HireX user perspective"
            className="inline-flex max-w-full flex-wrap items-center gap-1 self-start rounded-xl border border-slate-800 bg-[#090F1D] p-1.5"
          >
            {USER_SOLUTIONS.map((persona) => {
              const Icon = PERSONA_ICONS[persona.id];
              const isSelected = persona.id === activePersona.id;
              return (
                <button
                  key={persona.id}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => setActivePersonaId(persona.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer sm:px-4 sm:py-2.5 ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {persona.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated Persona Solution & How-It-Works Workflow */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePersona.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 space-y-6"
          >
            {/* Part A: User Solution Split */}
            <div className="grid grid-cols-1 gap-8 rounded-2xl border border-slate-800 bg-[#080F1D] p-6 sm:p-10 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-5">
                <div>
                  <p className="text-xs font-medium text-cyan-300">
                    For {activePersona.label}
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-bold text-white sm:text-3xl">
                    {activePersona.headline}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">
                    {activePersona.description}
                  </p>
                </div>

                <ModuleMotionVideo
                  role={`persona-${activePersona.id}`}
                  title={`${activePersona.label} Workflow`}
                  caption={`Animated ${activePersona.label.toLowerCase()} operating loop`}
                  heightClass="h-40 sm:h-44"
                  className="mt-5"
                />

                <div className="mt-5 border-t border-slate-800 pt-4">
                  <p className="font-display font-mono-tabular text-4xl font-bold text-cyan-300">
                    {activePersona.illustrativeMetric.value}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    {activePersona.illustrativeMetric.caption}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
                {activePersona.capabilities.map((cap, idx) => (
                  <div
                    key={cap.title}
                    className="rounded-xl border border-slate-800/90 bg-[#050A14] p-5"
                  >
                    <p className="font-mono-tabular text-xs text-blue-300">0{idx + 1}</p>
                    <h4 className="font-display mt-2 text-base font-semibold text-white">
                      {cap.title}
                    </h4>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      {cap.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Part B: Interactive How-It-Works 4-Step Flow */}
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-blue-300">
                    How It Works · {activePersona.label} Workflow
                  </p>
                  <h3 className="font-display mt-1 text-xl font-bold text-white">
                    Step-by-step operational flow
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onOpenGetStarted}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  Request {activePersona.label} Walkthrough
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {activePersona.workflowSteps.map((step) => (
                  <div
                    key={step.step}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#091120] p-5"
                  >
                    <div>
                      <span className="font-mono-tabular text-xs font-semibold text-cyan-300">
                        Step {step.step}
                      </span>
                      <h4 className="font-display mt-2 text-base font-semibold text-white">
                        {step.title}
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {step.detail}
                      </p>
                    </div>
                    <p className="mt-5 border-t border-slate-800/80 pt-3 text-[11px] font-medium text-blue-300">
                      Outcome: {step.outcome}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
