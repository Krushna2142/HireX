import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../data/hirexData';

interface FaqAndFinalCtaProps {
  onOpenGetStarted: () => void;
}

export default function FaqAndFinalCta({ onOpenGetStarted }: FaqAndFinalCtaProps) {
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id);

  return (
    <>
      {/* ================================================================= */}
      {/* FAQ ACCORDION                                                     */}
      {/* ================================================================= */}
      <section
        id="faq"
        className="scroll-mt-16 border-t border-slate-800/70 bg-[#04070D] py-10 sm:scroll-mt-20 sm:py-14"
      >
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wider text-cyan-300">
              Frequently Asked Questions
            </p>
            <h2 className="font-display mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Clarity on architecture, campus scale, and demo scope.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Everything presented on this experimental HireX Motion Lab site uses deterministic fictional datasets and local simulations.
            </p>
          </div>

          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 lg:col-span-7">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id} className="py-5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? '' : item.id)}
                    className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer"
                  >
                    <span className="font-display text-base font-semibold text-white sm:text-lg">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-cyan-300 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 pr-8 text-sm leading-relaxed text-slate-300">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* ANIMATED FINAL CTA                                                */}
      {/* ================================================================= */}
      <section className="relative overflow-hidden border-t border-slate-800/70 bg-[#050912] py-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.12),rgba(139,92,246,0.06)_40%,transparent_72%)]"
        />

        <div className="relative z-10 mx-auto max-w-[1000px] px-5 text-center sm:px-8">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-medium tracking-wider text-cyan-300"
          >
            HireX Motion Lab · Next-Generation Talent Architecture
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="font-display mx-auto mt-4 max-w-4xl text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            BUILD THE NEXT GENERATION OF HIRING WITH HIREX.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300"
          >
            Experience unified resume intelligence, transparent ATS checks, adaptive AI screening, and all-branch campus placement workflows.
          </motion.p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenGetStarted}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-7 py-3.5 text-sm font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-transform duration-200 hover:bg-cyan-300 active:scale-[0.98] cursor-pointer"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#hero"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0A1120] px-6 py-3.5 text-sm font-semibold text-slate-100 whitespace-nowrap shrink-0 hover:border-cyan-400/60"
            >
              Back to Top
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* QUIET EDITORIAL FOOTER                                            */}
      {/* ================================================================= */}
      <footer className="border-t border-slate-800/80 bg-[#04070D] py-8">
        <div className="mx-auto flex max-w-[1360px] flex-col justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-center">
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              HIREX
            </span>
            <p className="mt-1.5 text-xs text-slate-400">
              Experimental AI Recruitment &amp; Campus Hiring Showcase · Fictional Demo Data Only
            </p>
          </div>

          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#chapter-01" className="hover:text-white whitespace-nowrap">
              Platform
            </a>
            <a href="#chapter-02" className="hover:text-white whitespace-nowrap">
              Modules
            </a>
            <a href="#chapter-08" className="hover:text-white whitespace-nowrap">
              Campus Hiring
            </a>
            <a href="#solutions" className="hover:text-white whitespace-nowrap">
              Solutions
            </a>
            <a href="#faq" className="hover:text-white whitespace-nowrap">
              FAQ
            </a>
          </nav>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} HireX Motion Lab. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
