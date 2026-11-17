import { useEffect, useRef } from 'react';

interface MotionBackdropCanvasProps {
  variant?: 'neural' | 'waves';
  className?: string;
}

export default function MotionBackdropCanvas({
  variant = 'neural',
  className = '',
}: MotionBackdropCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = (canvas.width = canvas.offsetWidth || 960);
    let height = (canvas.height = canvas.offsetHeight || 540);
    let animId = 0;
    let isVisible = true;

    const nodes = Array.from({ length: 28 }, (_, i) => ({
      x: ((i * 137.5) % 100) / 100,
      y: ((i * 73.1) % 100) / 100,
      vx: (((i % 5) - 2) * 0.00025) + 0.00012,
      vy: (((i % 3) - 1) * 0.0002) - 0.00008,
      radius: 1.5 + (i % 3) * 0.8,
    }));

    const drawFrame = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (variant === 'waves') {
        for (let line = 0; line < 4; line++) {
          ctx.beginPath();
          ctx.strokeStyle =
            line % 2 === 0 ? 'rgba(34, 211, 238, 0.16)' : 'rgba(147, 197, 253, 0.12)';
          ctx.lineWidth = 1.25;
          for (let x = 0; x <= width; x += 24) {
            const y =
              height * (0.28 + line * 0.15) +
              Math.sin(x * 0.005 + t * 0.0011 + line * 1.4) * 26 +
              Math.cos(x * 0.009 - t * 0.0007) * 14;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!prefersReducedMotion) {
            n.x = (n.x + n.vx + 1) % 1;
            n.y = (n.y + n.vy + 1) % 1;
          }
          const px = n.x * width;
          const py = n.y * height;

          for (let j = i + 1; j < nodes.length; j++) {
            const m = nodes[j];
            const mx = m.x * width;
            const my = m.y * height;
            const dist = Math.hypot(px - mx, py - my);
            if (dist < 175) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(34, 211, 238, ${0.18 * (1 - dist / 175)})`;
              ctx.lineWidth = 1;
              ctx.moveTo(px, py);
              ctx.lineTo(mx, my);
              ctx.stroke();
            }
          }

          ctx.beginPath();
          ctx.fillStyle = i % 4 === 0 ? 'rgba(139, 92, 246, 0.55)' : 'rgba(147, 197, 253, 0.5)';
          ctx.arc(px, py, n.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    let lastTime = 0;
    const loop = (now: number) => {
      if (isVisible && now - lastTime > 32) {
        drawFrame(now);
        lastTime = now;
      }
      animId = window.requestAnimationFrame(loop);
    };

    if (prefersReducedMotion) {
      drawFrame(1200);
    } else {
      animId = window.requestAnimationFrame(loop);
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 960;
      height = canvas.height = canvas.offsetHeight || 540;
      if (prefersReducedMotion) drawFrame(1200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none h-full w-full ${className}`}
    />
  );
}
