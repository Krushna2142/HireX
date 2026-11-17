import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDownRight, ArrowRight, Briefcase, CheckCircle2, Layers } from 'lucide-react';
import HeroCanvas3D from './HeroCanvas3D';
import { HERO_MEDIA } from '../data/hirexData';

interface HeroSectionProps {
  onOpenGetStarted: () => void;
}

const HEADLINE_WORDS = [
  'THE',
  'FUTURE',
  'OF',
  'HIRING',
  'IS',
  'ALREADY',
  'HERE.',
];

export default function HeroSection({ onOpenGetStarted }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [pointerNorm, setPointerNorm] = useState({ x: 0, y: 0 });
  const [spotPos, setSpotPos] = useState({ x: 68, y: 46 });
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [studentImgFailed, setStudentImgFailed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      setPointerNorm({ x: nx, y: ny });
      setSpotPos({
        x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100,
        y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100,
      });
    };

    el.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => el.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative flex min-h-[84vh] w-full items-center overflow-hidden bg-[#04070D] pt-20 pb-8 lg:min-h-[88vh]"
    >
      {/* Layer 1: Dark Cinematic Backdrop Media + Graceful Fallback */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {!heroImgFailed ? (
          <motion.img
            src={HERO_MEDIA.heroBackdrop}
            alt="Abstract dark obsidian crystal architecture illuminated by electric cyan light"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.34, scale: 1 }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_70%_40%,rgba(34,211,238,0.18),rgba(139,92,246,0.12)_45%,#04070D_80%)]" />
        )}

        {/* Measured Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#04070D] via-[#04070D]/82 to-[#04070D]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070D] via-transparent to-[#04070D]/60" />

        {/* Subtle Cursor-Reactive Atmospheric Light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: `radial-gradient(620px circle at ${spotPos.x}% ${spotPos.y}%, rgba(34, 211, 238, 0.13), rgba(139, 92, 246, 0.05) 45%, transparent 72%)`,
          }}
        />
      </div>

      {/* Layer 2: Interactive Three.js 3D Ambient Orbital Scene */}
      <HeroCanvas3D pointerNorm={pointerNorm} />

      {/* Layer 3: Semantic Hero Content & Animated Student Orbital Focal Stage */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1360px] grid-cols-1 items-center gap-10 px-5 sm:px-8 md:grid-cols-12">
        {/* Left Column: Word-by-Word Reveal Headline + CTAs */}
        <div className="md:col-span-6 lg:col-span-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mb-4 text-xs font-medium tracking-wider text-cyan-300/90"
          >
            HireX · AI Recruitment &amp; Campus Hiring
          </motion.p>

          <h1
            className="font-display max-w-2xl text-balance font-extrabold tracking-tight text-white"
            style={{
              fontSize: 'clamp(2.25rem, 4.4vw, 4.25rem)',
              lineHeight: 1.05,
            }}
          >
            {HEADLINE_WORDS.map((word, idx) => (
              <motion.span
                key={`${word}-${idx}`}
                initial={{ opacity: 0, filter: 'blur(10px)', y: 16 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + idx * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`mr-[0.26em] inline-block ${
                  word === 'ALREADY' || word === 'HERE.'
                    ? 'bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent'
                    : ''
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg"
          >
            One intelligent platform connecting AI-powered recruitment, candidate discovery,
            resume analysis, interviews and campus hiring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3.5"
          >
            <button
              type="button"
              onClick={onOpenGetStarted}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-transform duration-200 hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 cursor-pointer"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="#chapter-01"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/90 bg-[#0B1222]/95 px-6 py-3 text-sm font-semibold text-slate-100 whitespace-nowrap shrink-0 transition-colors duration-200 hover:border-cyan-400/60 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Explore HireX
              <ArrowDownRight className="h-4 w-4 text-cyan-300" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.2 }}
            className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800/80 pt-5 text-xs text-slate-400"
          >
            <span>Candidates</span>
            <span aria-hidden="true">·</span>
            <span>Recruiters</span>
            <span aria-hidden="true">·</span>
            <span>Enterprise Teams</span>
            <span aria-hidden="true">·</span>
            <span>Colleges &amp; Placement Officers</span>
          </motion.div>
        </div>

        {/* Right Column: Animated Student Portrait + Concentric Orbital Rings + Floating Product Cards */}
        <div className="relative flex items-center justify-center md:col-span-6 lg:col-span-6">
          <div className="relative flex h-[370px] w-full max-w-[520px] items-center justify-center sm:h-[440px] lg:h-[520px]">
            {/* Concentric Animated Orbital Rings (inspired by reference circle framing, dark HireX cyan/ice/violet aesthetic) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 500 500"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {/* Outer Electric Cyan Ring */}
              <motion.circle
                cx="250"
                cy="250"
                r="214"
                fill="none"
                stroke="rgba(34, 211, 238, 0.55)"
                strokeWidth="1.5"
                strokeDasharray="10 6"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1, scale: 1, rotate: 360 }
                }
                transition={{
                  opacity: { duration: 0.8, delay: 0.4 },
                  scale: { duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
                  rotate: { duration: 48, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '250px', originY: '250px' }}
              />

              {/* Middle Ice Blue Ring */}
              <motion.circle
                cx="250"
                cy="250"
                r="164"
                fill="none"
                stroke="rgba(147, 197, 253, 0.35)"
                strokeWidth="1.25"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Inner Violet Accent Arc */}
              <motion.circle
                cx="250"
                cy="250"
                r="116"
                fill="none"
                stroke="rgba(139, 92, 246, 0.35)"
                strokeWidth="1.25"
                strokeDasharray="120 42"
                initial={{ opacity: 0, scale: 0.82 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 1, scale: 1, rotate: -360 }
                }
                transition={{
                  opacity: { duration: 0.8, delay: 0.65 },
                  scale: { duration: 0.9, delay: 0.65 },
                  rotate: { duration: 36, repeat: Infinity, ease: 'linear' },
                }}
                style={{ originX: '250px', originY: '250px' }}
              />

              {/* Orbiting Accent Nodes */}
              <circle cx="464" cy="250" r="4" fill="#22D3EE" />
              <circle cx="96" cy="308" r="3.5" fill="#93C5FD" />
              <circle cx="315" cy="98" r="3.5" fill="#A78BFA" />
            </svg>

            {/* Ambient Cyan Backlight behind Student */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),rgba(139,92,246,0.1)_48%,transparent_75%)] sm:h-80 sm:w-80"
            />

            {/* Animated Student Portrait (Smoothly Masked into Dark Obsidian Canvas) */}
            <motion.div
              data-testid="hero-student-visual"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, scale: 1, y: 0 }
                  : {
                      opacity: 1,
                      scale: 1,
                      y: [0, -8, 0],
                    }
              }
              transition={{
                opacity: { duration: 0.85, delay: 0.45 },
                scale: { duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.1 },
              }}
              className="relative z-10 flex h-[300px] w-[300px] items-end justify-center sm:h-[370px] sm:w-[370px] lg:h-[430px] lg:w-[430px]"
            >
              {!studentImgFailed ? (
                <img
                  src={HERO_MEDIA.studentPortrait}
                  alt="Smiling engineering student holding a laptop connected to HireX AI recruitment platform"
                  referrerPolicy="no-referrer"
                  onError={() => setStudentImgFailed(true)}
                  className="h-full w-full rounded-full object-cover object-top"
                  style={{
                    maskImage:
                      'radial-gradient(circle at 50% 48%, rgba(0,0,0,1) 54%, rgba(0,0,0,0.85) 66%, rgba(0,0,0,0) 82%)',
                    WebkitMaskImage:
                      'radial-gradient(circle at 50% 48%, rgba(0,0,0,1) 54%, rgba(0,0,0,0.85) 66%, rgba(0,0,0,0) 82%)',
                  }}
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-full border border-cyan-400/40 bg-[#0A1628] text-center text-xs text-cyan-200">
                  Candidate Portrait Preview
                </div>
              )}
            </motion.div>

            {/* Floating Card 1 (Top-Left of Circle, inspired by reference badge) */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, x: 0, y: 0 }
                  : { opacity: 1, x: 0, y: [0, -5, 0] }
              }
              transition={{
                opacity: { duration: 0.65, delay: 0.85 },
                x: { duration: 0.65, delay: 0.85, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 },
              }}
              className="absolute top-6 left-0 z-20 rounded-xl border border-slate-700/90 bg-[#091120]/95 px-3.5 py-2.5 shadow-2xl sm:top-10 sm:left-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-400/10 text-cyan-300">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono-tabular text-xs font-bold text-white">
                    120+ Roles Matched
                  </p>
                  <p className="text-[11px] text-cyan-300">94% ATS Fit Ready</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 2 (Bottom-Right of Circle) */}
            <motion.div
              initial={{ opacity: 0, x: 20, y: 12 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, x: 0, y: 0 }
                  : { opacity: 1, x: 0, y: [0, 5, 0] }
              }
              transition={{
                opacity: { duration: 0.65, delay: 1.0 },
                x: { duration: 0.65, delay: 1.0, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 1.8 },
              }}
              className="absolute bottom-2 left-0 z-20 rounded-xl border border-slate-700/90 bg-[#0B1325]/95 px-3.5 py-2.5 shadow-2xl sm:right-2 sm:bottom-8 sm:left-auto"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/35 bg-blue-400/10 text-blue-300">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono-tabular text-xs font-bold text-white">
                      3,170 Students
                    </p>
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">7 Academic Branches</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
