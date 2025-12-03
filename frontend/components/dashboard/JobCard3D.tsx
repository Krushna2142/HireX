// components/dashboard/JobCard3D.tsx
"use client";
import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function JobCard3D({
  title,
  company,
  location,
  tags = [],
}: {
  title: string;
  company?: string;
  location?: string;
  tags?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [12, -12]);
  const rotateY = useTransform(x, [-50, 50], [-12, 12]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    x.set((px - 0.5) * 60);
    y.set((py - 0.5) * 60);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <div className="perspective-3d">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX, rotateY }}
        className="card-layer relative w-full rounded-2xl border border-border bg-card p-6 shadow-neon-soft transition-transform"
      >
        <div className="absolute -inset-1 rounded-2xl blur-2xl opacity-30" style={{ background: "linear-gradient(90deg,#7c3aed20,#06b6d420)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <div className="text-sm text-muted-foreground">{company} • {location}</div>
            </div>
            <div className="text-xs text-muted-foreground">Full-time</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => <span key={t} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t}</span>)}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Apply</button>
            <div className="text-xs text-muted-foreground">Posted 2d ago</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
