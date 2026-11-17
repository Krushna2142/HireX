import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  formatVideoTimestamp,
  getModuleVideoDuration,
  type ModuleVideoRole,
} from '../utils/hirexLogic';
import {
  drawModuleVideoFrame,
  type ModuleVideoContext,
} from '../utils/moduleVideoRenderers';

interface ModuleMotionVideoProps {
  role: ModuleVideoRole;
  title: string;
  caption: string;
  contextData?: ModuleVideoContext;
  className?: string;
  heightClass?: string;
}

export default function ModuleMotionVideo({
  role,
  title,
  caption,
  contextData = {},
  className = '',
  heightClass = 'h-56 sm:h-64',
}: ModuleMotionVideoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<ModuleVideoContext>(contextData);
  const progressRef = useRef(0.18);

  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.18);

  const durationSeconds = getModuleVideoDuration(role);

  // Keep latest reactive module props accessible inside RAF without tearing down canvas
  useEffect(() => {
    contextRef.current = contextData;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const w = canvas.clientWidth || 560;
      const h = canvas.clientHeight || 240;
      drawModuleVideoFrame(ctx, w, h, role, progressRef.current, contextRef.current);
    }
  }, [contextData, role]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPlaying(false);
    }

    let isVisible = true;
    let rafId = 0;
    let lastDraw = performance.now();
    let lastClockSync = performance.now();

    const syncSizeAndRender = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(280, container.clientWidth);
      const h = Math.max(160, canvas.clientHeight || 220);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawModuleVideoFrame(ctx, w, h, role, progressRef.current, contextRef.current);
    };

    syncSizeAndRender();

    const resizeObserver = new ResizeObserver(syncSizeAndRender);
    resizeObserver.observe(container);

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(container);

    const tick = (now: number) => {
      if (isPlaying && !prefersReducedMotion && isVisible) {
        const dt = Math.min(100, now - lastDraw);
        if (dt >= 33) {
          progressRef.current = (progressRef.current + dt / (durationSeconds * 1000)) % 1;
          lastDraw = now;

          const w = Math.max(280, container.clientWidth);
          const h = Math.max(160, canvas.clientHeight || 220);
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawModuleVideoFrame(ctx, w, h, role, progressRef.current, contextRef.current);

          if (now - lastClockSync >= 200) {
            setProgress(progressRef.current);
            lastClockSync = now;
          }
        }
      } else {
        lastDraw = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      io.disconnect();
    };
  }, [role, isPlaying, durationSeconds]);

  const handleRestart = () => {
    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
  };

  const handleScrub = (nextRatio: number) => {
    const clamped = Math.max(0, Math.min(1, nextRatio));
    progressRef.current = clamped;
    setProgress(clamped);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && containerRef.current) {
      const w = Math.max(280, containerRef.current.clientWidth);
      const h = Math.max(160, canvas.clientHeight || 220);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawModuleVideoFrame(ctx, w, h, role, clamped, contextRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid={`module-video-${role}`}
      data-playing={isPlaying ? 'true' : 'false'}
      className={`overflow-hidden rounded-xl border border-slate-800/90 bg-[#050A14] ${className}`}
    >
      {/* Animated Canvas Reel Viewport */}
      <div className={`relative w-full ${heightClass}`}>
        <canvas
          ref={canvasRef}
          aria-label={`Animated workflow video for ${title}`}
          className="block h-full w-full"
        />
      </div>

      {/* Compact Media Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 bg-[#070D19] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? `Pause ${title} animation` : `Play ${title} animation`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-cyan-300 transition-colors hover:border-cyan-400 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            aria-label={`Replay ${title} animation`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-cyan-400 hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <span className="text-[11px] font-medium text-slate-300 truncate max-w-[200px] sm:max-w-[260px]">
            {caption}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(progress * 100)}
            onChange={(e) => handleScrub(Number(e.target.value) / 100)}
            aria-label={`Scrub ${title} timeline`}
            className="h-1 w-20 accent-cyan-400 cursor-pointer sm:w-28"
          />
          <span className="font-mono-tabular text-[11px] text-slate-400">
            {formatVideoTimestamp(progress, durationSeconds)} / {formatVideoTimestamp(1, durationSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
