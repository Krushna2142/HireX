import { useEffect, useState, type RefObject } from 'react';
import { computeSpineScrollState } from '../utils/hirexLogic';

interface SpineChapterMeta {
  id: string;
  code: string;
  label: string;
}

const SPINE_CHAPTERS: SpineChapterMeta[] = [
  { id: 'chapter-01', code: '01', label: 'Fragmented Hiring' },
  { id: 'chapter-02', code: '02', label: 'HireX Intelligence' },
  { id: 'chapter-03', code: '03', label: 'AI Resume Analysis' },
  { id: 'chapter-04', code: '04', label: 'ATS Checker' },
  { id: 'chapter-05', code: '05', label: 'Smart Job Matching' },
  { id: 'chapter-06', code: '06', label: 'Recruitment Pipeline' },
  { id: 'chapter-07', code: '07', label: 'AI Interview' },
  { id: 'chapter-08', code: '08', label: 'Campus Hiring' },
];

interface ModuleScrollSpineProps {
  trackRef: RefObject<HTMLDivElement | null>;
}

export default function ModuleScrollSpine({ trackRef }: ModuleScrollSpineProps) {
  const [nodeOffsetsY, setNodeOffsetsY] = useState<number[]>([]);
  const [scrollState, setScrollState] = useState({
    progress: 0,
    litUpToY: 0,
    activeIndex: 0,
    litCount: 1,
  });

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return;

    let measuredOffsets: number[] = [];
    let rafPending = false;

    const measureNodes = () => {
      const trackRect = trackEl.getBoundingClientRect();
      const headerOffset = window.innerWidth >= 640 ? 64 : 48;
      const offsets: number[] = [];

      for (const ch of SPINE_CHAPTERS) {
        const el = document.getElementById(ch.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          offsets.push(Math.round(rect.top - trackRect.top + headerOffset));
        }
      }

      if (offsets.length > 0) {
        measuredOffsets = offsets;
        setNodeOffsetsY(offsets);
      }
    };

    const updateScroll = () => {
      rafPending = false;
      if (!trackEl || measuredOffsets.length === 0) return;
      const trackRect = trackEl.getBoundingClientRect();
      const next = computeSpineScrollState(
        measuredOffsets,
        trackRect.top,
        window.innerHeight,
        0.44,
      );
      setScrollState(next);
    };

    const onScrollOrResize = () => {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(() => {
          updateScroll();
        });
      }
    };

    measureNodes();
    updateScroll();

    const resizeObserver = new ResizeObserver(() => {
      measureNodes();
      updateScroll();
    });
    resizeObserver.observe(trackEl);

    const handleResize = () => {
      measureNodes();
      onScrollOrResize();
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [trackRef]);

  if (nodeOffsetsY.length < 2) {
    return null;
  }

  const firstY = nodeOffsetsY[0];
  const lastY = nodeOffsetsY[nodeOffsetsY.length - 1];
  const totalSpan = Math.max(1, lastY - firstY);
  const litLength = Math.max(0, Math.min(totalSpan, scrollState.progress * totalSpan));

  return (
    <div
      data-testid="module-scroll-spine"
      data-progress={scrollState.progress.toFixed(2)}
      data-active-index={scrollState.activeIndex}
      aria-label="Module scroll progression timeline"
      className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-full max-w-[1360px] -translate-x-1/2"
    >
      {/* Vertical Spine Lane (Aligned cleanly inside chapter left gutter) */}
      <div className="relative h-full w-full">
        {/* 1. Unlit Base Vertical Line joining all module nodes 01 -> 08 */}
        <div
          aria-hidden="true"
          className="absolute left-[21px] w-[2px] rounded-full bg-slate-800/85 sm:left-[31px] lg:left-[37px]"
          style={{
            top: `${firstY}px`,
            height: `${totalSpan}px`,
          }}
        />

        {/* 2. Scroll-Driven Glowing Gradient Line (scales downwards smoothly as user scrolls) */}
        <div
          aria-hidden="true"
          className="absolute left-[20.75px] w-[2.5px] origin-top rounded-full bg-gradient-to-b from-cyan-400 via-blue-400 to-violet-400 sm:left-[30.75px] lg:left-[36.75px]"
          style={{
            top: `${firstY}px`,
            height: `${totalSpan}px`,
            transform: `scaleY(${Math.max(0.001, scrollState.progress)})`,
            boxShadow:
              '0 0 14px rgba(34, 211, 238, 0.72), 0 0 28px rgba(59, 130, 246, 0.35)',
          }}
        />

        {/* 3. Animated Flowing Luminance Stream inside the Glowing Scrolled Span */}
        <div
          aria-hidden="true"
          className="absolute left-[20px] w-[4px] overflow-hidden rounded-full sm:left-[30px] lg:left-[36px]"
          style={{
            top: `${firstY}px`,
            height: `${litLength}px`,
          }}
        >
          <div className="hirex-spine-stream w-full opacity-90" />
        </div>

        {/* 4. Leading Scroll Frontier Spark */}
        <div
          aria-hidden="true"
          className="absolute left-[17px] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white sm:left-[27px] lg:left-[33px]"
          style={{
            top: `${firstY + litLength}px`,
            boxShadow:
              '0 0 12px 3px rgba(34, 211, 238, 0.95), 0 0 26px 6px rgba(139, 92, 246, 0.5)',
          }}
        />

        {/* 5. Clickable Numbered Module Nodes (01 .. 08) */}
        {SPINE_CHAPTERS.map((chapter, idx) => {
          const y = nodeOffsetsY[idx];
          if (y === undefined) return null;
          const isLit = idx < scrollState.litCount;
          const isActive = idx === scrollState.activeIndex;

          return (
            <button
              key={chapter.id}
              type="button"
              data-lit={isLit ? 'true' : 'false'}
              aria-label={`Jump to ${chapter.code}. ${chapter.label}`}
              onClick={() => {
                document.getElementById(chapter.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`pointer-events-auto absolute left-[10px] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border font-mono-tabular text-[10px] font-bold transition-all duration-200 cursor-pointer sm:left-[18px] sm:h-7 sm:w-7 sm:text-[11px] lg:left-[24px] ${
                isActive
                  ? 'scale-110 border-cyan-200 bg-cyan-400 text-slate-950 ring-4 ring-cyan-400/25'
                  : isLit
                  ? 'border-cyan-400 bg-[#0B1E38] text-cyan-200'
                  : 'border-slate-700/90 bg-[#070C17] text-slate-500 hover:border-cyan-400/60 hover:text-slate-200'
              }`}
              style={{
                top: `${y}px`,
                ...(isLit && !isActive
                  ? { boxShadow: '0 0 14px rgba(34, 211, 238, 0.45)' }
                  : isActive
                  ? { boxShadow: '0 0 20px rgba(34, 211, 238, 0.75)' }
                  : {}),
              }}
            >
              {chapter.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
