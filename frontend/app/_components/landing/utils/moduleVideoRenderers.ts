import type { ModuleVideoRole } from './hirexLogic';

export interface ModuleVideoContext {
  unifiedMode?: boolean;
  activeModuleIndex?: number;
  activeModuleTitle?: string;
  candidateName?: string;
  skills?: string[];
  resumeStageIdx?: number;
  score?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  jobTitle?: string;
  matchScore?: number;
  company?: string;
  roleTitle?: string;
  alignedSkills?: string[];
  activeStageIdx?: number;
  stageName?: string;
  stageCount?: number;
  speaker?: 'ai' | 'candidate';
  turnProgress?: number;
  minCgpa?: number;
  eligibilityRate?: number;
  totalStudents?: number;
  eligibleStudents?: number;
  selectedBranchName?: string;
}

const CYAN = '#22D3EE';
const ICE = '#93C5FD';
const VIOLET = '#A78BFA';
const AMBER = '#FBBF24';
const SLATE_BG = '#050A14';
const CARD_BG = '#0A1324';
const BORDER = 'rgba(51, 65, 85, 0.72)';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const safeW = Math.max(2, w);
  const safeH = Math.max(2, h);
  const radius = Math.min(r, safeW / 2, safeH / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + safeW - radius, y);
  ctx.quadraticCurveTo(x + safeW, y, x + safeW, y + radius);
  ctx.lineTo(x + safeW, y + safeH - radius);
  ctx.quadraticCurveTo(x + safeW, y + safeH, x + safeW - radius, y + safeH);
  ctx.lineTo(x + radius, y + safeH);
  ctx.quadraticCurveTo(x, y + safeH, x, y + safeH - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Scales font down smoothly (with clean ellipsis fallback only if still exceeding maxWidth)
 * so text never crosses a box or circle boundary at any canvas width.
 */
function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    weight?: number;
    size?: number;
    minSize?: number;
    family?: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {},
) {
  const {
    weight = 600,
    size = 10.5,
    minSize = 7.5,
    family = '"Plus Jakarta Sans", sans-serif',
    color = '#F8FAFC',
    align = 'center',
    baseline = 'middle',
  } = options;

  const safeMaxW = Math.max(16, maxWidth);
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px ${family}`;

  while (ctx.measureText(text).width > safeMaxW && fontSize > minSize) {
    fontSize = Math.max(minSize, fontSize - 0.5);
    ctx.font = `${weight} ${fontSize}px ${family}`;
  }

  let output = text;
  if (ctx.measureText(output).width > safeMaxW) {
    while (output.length > 2 && ctx.measureText(`${output}…`).width > safeMaxW) {
      output = output.slice(0, -1);
    }
    output = `${output}…`;
  }

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(output, x, y);
}

function drawBackdropGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = SLATE_BG;
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.5, w * 0.65);
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
  grad.addColorStop(0.55, 'rgba(139, 92, 246, 0.04)');
  grad.addColorStop(1, 'rgba(4, 7, 13, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 1;
  const step = 36;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  fill: string,
  maxBoxWidth = 140,
) {
  ctx.font = '600 10px "JetBrains Mono", monospace';
  const padX = 9;
  const idealW = ctx.measureText(text).width + padX * 2;
  const boxW = Math.min(maxBoxWidth, Math.max(44, idealW));
  const boxH = 22;
  drawRoundedRect(ctx, x, y, boxW, boxH, 6);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  drawFittedText(ctx, text, x + boxW / 2, y + boxH / 2 + 0.5, boxW - 12, {
    weight: 600,
    size: 10,
    minSize: 7.5,
    family: '"JetBrains Mono", monospace',
    color,
    align: 'center',
    baseline: 'middle',
  });
  return boxW;
}

function pointOnCubic(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
  ];
}

// 1. Fragmented Hiring -> Unified Convergence Reel
function renderFragmentedHiring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const sources = ['Resumes.pdf', 'Job Boards', 'CSV Lists', 'Calendars', 'TPO Sheets'];
  const outputs = ['Parsed Graph', 'ATS Benchmark', 'Live Shortlist', 'Offer Ledger'];
  const unified = Boolean(data.unifiedMode);
  const pulse = (p * 2) % 1;

  const cx = w * 0.5;
  const cy = h * 0.5;
  const coreRadius = clamp(Math.min(w * 0.13, h * 0.22), 28, 40);
  const marginX = clamp(w * 0.04, 8, 36);
  const leftBoxW = clamp(w * 0.24, 72, 112);
  const rightBoxW = clamp(w * 0.26, 78, 126);
  const boxH = clamp(h * 0.14, 22, 28);

  // Left source artifacts drifting or converging
  sources.forEach((label, idx) => {
    const baseY = h * (0.14 + idx * 0.18);
    const jitterX = unified ? 0 : Math.sin(p * Math.PI * 2 + idx * 1.4) * clamp(w * 0.015, 4, 12);
    const jitterY = unified ? 0 : Math.cos(p * Math.PI * 2 + idx * 1.9) * 5;
    const bx = clamp(marginX + jitterX, 6, cx - coreRadius - leftBoxW - 14);
    const by = clamp(baseY + jitterY - boxH / 2, 6, h - boxH - 6);

    const start: [number, number] = [bx + leftBoxW, by + boxH / 2];
    const cp1: [number, number] = [bx + leftBoxW + (cx - coreRadius - (bx + leftBoxW)) * 0.5, by + boxH / 2];
    const cp2: [number, number] = [cx - coreRadius - 24, cy];
    const end: [number, number] = [cx - coreRadius, cy];

    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
    ctx.strokeStyle = unified ? 'rgba(34, 211, 238, 0.55)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = unified ? 1.8 : 1.1;
    ctx.setLineDash(unified ? [] : [5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const tPos = (pulse + idx * 0.18) % 1;
    const [px, py] = pointOnCubic(start, cp1, cp2, end, tPos);
    ctx.beginPath();
    ctx.arc(px, py, unified ? 3.2 : 2.3, 0, Math.PI * 2);
    ctx.fillStyle = unified ? CYAN : AMBER;
    ctx.fill();

    drawRoundedRect(ctx, bx, by, leftBoxW, boxH, 7);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = unified ? 'rgba(34, 211, 238, 0.45)' : 'rgba(251, 191, 36, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawFittedText(ctx, label, bx + leftBoxW / 2, by + boxH / 2 + 0.5, leftBoxW - 12, {
      weight: 600,
      size: 10.5,
      minSize: 7.5,
      color: '#E2E8F0',
    });
  });

  // Right structured records
  const ox = w - rightBoxW - marginX;
  outputs.forEach((label, idx) => {
    const oy = clamp(h * (0.18 + idx * 0.21) - boxH / 2, 6, h - boxH - 6);
    const start: [number, number] = [cx + coreRadius, cy];
    const cp1: [number, number] = [cx + coreRadius + 24, cy];
    const cp2: [number, number] = [ox - (ox - (cx + coreRadius)) * 0.5, oy + boxH / 2];
    const end: [number, number] = [ox, oy + boxH / 2];

    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const tPos = (pulse + 0.35 + idx * 0.22) % 1;
    const [px, py] = pointOnCubic(start, cp1, cp2, end, tPos);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = ICE;
    ctx.fill();

    drawRoundedRect(ctx, ox, oy, rightBoxW, boxH, 7);
    ctx.fillStyle = '#0D1A2F';
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFittedText(ctx, label, ox + rightBoxW / 2, oy + boxH / 2 + 0.5, rightBoxW - 12, {
      weight: 600,
      size: 10.5,
      minSize: 7.5,
      color: '#F8FAFC',
    });
  });

  // Animated Center Core Lens
  const angle = p * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius + 8, angle, angle + Math.PI * 1.45);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#091426';
  ctx.fill();
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const innerSpan = coreRadius * 1.65;
  drawFittedText(ctx, 'HIREX CORE', cx, cy - 6, innerSpan, {
    weight: 700,
    size: 10.5,
    minSize: 7,
    family: '"Bricolage Grotesque", sans-serif',
    color: '#FFFFFF',
  });
  drawFittedText(ctx, unified ? 'SYNCED' : 'CONVERGING', cx, cy + 8, innerSpan, {
    weight: 500,
    size: 8.5,
    minSize: 6.5,
    family: '"JetBrains Mono", monospace',
    color: CYAN,
  });
}

// 2. Ecosystem Hub Animation (Fixed Talent Graph center circle & node bounds)
function renderEcosystem(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const labels = [
    '01 Resume AI',
    '02 ATS Check',
    '03 Matching',
    '04 Pipeline',
    '05 AI Screen',
    '06 Campus',
  ];
  const activeIdx = data.activeModuleIndex ?? 0;
  const cx = w * 0.5;
  const cy = h * 0.5;

  const boxW = clamp(w * 0.25, 72, 102);
  const boxH = clamp(h * 0.14, 22, 26);
  const rx = Math.max(boxW * 0.95, Math.min(w * 0.35, w / 2 - boxW / 2 - 10));
  const ry = Math.max(36, Math.min(h * 0.34, h / 2 - boxH / 2 - 8));

  const coords = labels.map((_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / labels.length;
    return [
      clamp(cx + Math.cos(a) * rx, boxW / 2 + 8, w - boxW / 2 - 8),
      clamp(cy + Math.sin(a) * ry, boxH / 2 + 6, h - boxH / 2 - 6),
    ] as [number, number];
  });

  // Ring track
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Connections from active node to core & neighbors
  coords.forEach((pt, idx) => {
    const isActive = idx === activeIdx;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pt[0], pt[1]);
    ctx.strokeStyle = isActive ? 'rgba(34, 211, 238, 0.72)' : 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    const packetT = (p * 3 + idx * 0.16) % 1;
    const px = cx + (pt[0] - cx) * packetT;
    const py = cy + (pt[1] - cy) * packetT;
    ctx.beginPath();
    ctx.arc(px, py, isActive ? 3.8 : 2.2, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? CYAN : VIOLET;
    ctx.fill();
  });

  // Center Hub (Two-line stacked label + fitted radius so text never crosses circle edge)
  const centerR = clamp(Math.min(w * 0.12, h * 0.21), 28, 36) + Math.sin(p * Math.PI * 4) * 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  ctx.fillStyle = '#0D1B30';
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const hubTextMaxW = centerR * 1.55;
  drawFittedText(ctx, 'TALENT', cx, cy - 6, hubTextMaxW, {
    weight: 700,
    size: 10,
    minSize: 7.5,
    family: '"Bricolage Grotesque", sans-serif',
    color: '#FFFFFF',
  });
  drawFittedText(ctx, 'GRAPH', cx, cy + 6.5, hubTextMaxW, {
    weight: 700,
    size: 10,
    minSize: 7.5,
    family: '"Bricolage Grotesque", sans-serif',
    color: CYAN,
  });

  // Module nodes
  coords.forEach(([nx, ny], idx) => {
    const isActive = idx === activeIdx;
    drawRoundedRect(ctx, nx - boxW / 2, ny - boxH / 2, boxW, boxH, 7);
    ctx.fillStyle = isActive ? '#0F2442' : CARD_BG;
    ctx.fill();
    ctx.strokeStyle = isActive ? CYAN : BORDER;
    ctx.lineWidth = isActive ? 1.6 : 1;
    ctx.stroke();

    drawFittedText(ctx, labels[idx], nx, ny + 0.5, boxW - 12, {
      weight: 600,
      size: 10,
      minSize: 7.5,
      color: isActive ? '#FFFFFF' : '#CBD5E1',
    });
  });
}

// 3. AI Resume Analysis Scanner Reel
function renderResumeAnalysis(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const docX = clamp(w * 0.05, 10, 28);
  const docY = h * 0.12;
  const docW = clamp(w * 0.34, 90, 175);
  const docH = h * 0.76;

  // Document card
  drawRoundedRect(ctx, docX, docY, docW, docH, 10);
  ctx.fillStyle = '#081020';
  ctx.fill();
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.32)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const shortName = (data.candidateName ?? 'Aarav Mehta').replace(' (Demo Profile)', '');
  drawFittedText(ctx, shortName, docX + 12, docY + 18, docW - 24, {
    weight: 700,
    size: 11.5,
    minSize: 8.5,
    family: '"Bricolage Grotesque", sans-serif',
    color: '#F8FAFC',
    align: 'left',
  });

  const scanY = docY + 14 + ((p * 2) % 1) * (docH - 28);
  const linesTop = docY + 34;
  const lineStep = 14;
  const lineCount = Math.max(4, Math.min(7, Math.floor((docH - 42) / lineStep)));

  for (let i = 0; i < lineCount; i++) {
    const ly = linesTop + i * lineStep;
    const isScanned = Math.abs(ly - scanY) < 14;
    const lw = Math.max(24, docW - 24 - ((i * 19) % Math.max(16, Math.floor(docW * 0.34))));
    drawRoundedRect(ctx, docX + 12, ly, lw, 6, 3);
    ctx.fillStyle = isScanned ? 'rgba(34, 211, 238, 0.55)' : 'rgba(148, 163, 184, 0.22)';
    ctx.fill();
  }

  // Sweeping Laser Scanline
  const beamGrad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
  beamGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
  beamGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.35)');
  beamGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(docX + 2, scanY - 12, docW - 4, 24);

  ctx.beginPath();
  ctx.moveTo(docX + 4, scanY);
  ctx.lineTo(docX + docW - 4, scanY);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Extracted Skill Chips & Stage Bar cleanly fit inside remaining right lane
  const skills = (data.skills ?? ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'System Design']).slice(0, 6);
  const rightX = docX + docW + clamp(w * 0.06, 14, 34);
  const rightAvailW = Math.max(110, w - rightX - 10);

  drawFittedText(ctx, 'EXTRACTED SKILL ENTITIES', rightX, docY + 8, rightAvailW, {
    weight: 600,
    size: 10,
    minSize: 7.5,
    family: '"JetBrains Mono", monospace',
    color: ICE,
    align: 'left',
  });

  const colGap = 6;
  const colW = (rightAvailW - colGap) / 2;
  const skillStartY = docY + 24;
  const skillRowH = clamp((docH - 58) / 3, 24, 34);

  skills.forEach((sk, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const sx = rightX + col * (colW + colGap);
    const sy = skillStartY + row * skillRowH;
    const active = ((p * 2) % 1) > idx * 0.12 || (data.resumeStageIdx ?? 4) >= 2;

    if (col === 0) {
      ctx.beginPath();
      ctx.moveTo(docX + docW, scanY);
      ctx.bezierCurveTo(docX + docW + 18, scanY, sx - 14, sy + 11, sx, sy + 11);
      ctx.strokeStyle = active ? 'rgba(34, 211, 238, 0.35)' : 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawTag(
      ctx,
      sx,
      sy,
      sk,
      active ? CYAN : 'rgba(148,163,184,0.55)',
      active ? 'rgba(34, 211, 238, 0.1)' : 'rgba(15, 23, 42, 0.7)',
      colW,
    );
  });

  // Bottom Stage Readout Bar
  const stages = ['Upload', 'Parse', 'Extract', 'Verify', 'Insights'];
  const stageGap = 4;
  const stageW = (rightAvailW - stageGap * (stages.length - 1)) / stages.length;
  const stY = docY + docH - 22;
  stages.forEach((st, idx) => {
    const stX = rightX + idx * (stageW + stageGap);
    const current = idx <= ((data.resumeStageIdx ?? Math.floor(((p * 5) % 5))) % 5);
    drawRoundedRect(ctx, stX, stY, stageW, 20, 4);
    ctx.fillStyle = current ? 'rgba(34, 211, 238, 0.18)' : 'rgba(15, 23, 42, 0.8)';
    ctx.fill();
    ctx.strokeStyle = current ? CYAN : BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    drawFittedText(ctx, st, stX + stageW / 2, stY + 10.5, stageW - 6, {
      weight: 600,
      size: 8.5,
      minSize: 6.5,
      color: current ? '#FFFFFF' : '#64748B',
    });
  });
}

// 4. ATS Checker Comparison & Arc Gauge Reel
function renderAtsChecker(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const matched = (data.matchedSkills ?? ['TypeScript', 'React', 'Node.js', 'PostgreSQL']).slice(0, 3);
  const missing = (data.missingSkills ?? ['Kubernetes']).slice(0, 2);
  const items = [
    ...matched.map((name) => ({ name, ok: true })),
    ...missing.map((name) => ({ name, ok: false })),
  ].slice(0, 5);
  const score = data.score ?? 82;

  const lx = clamp(w * 0.05, 10, 28);
  const rowW = clamp(w * 0.5, 140, 290);

  drawFittedText(ctx, 'JD SKILL MATRIX CHECK', lx, h * 0.11, rowW, {
    weight: 600,
    size: 10.5,
    minSize: 8,
    family: '"JetBrains Mono", monospace',
    color: ICE,
    align: 'left',
  });

  const startY = h * 0.21;
  const availH = h * 0.72;
  const rowStep = availH / Math.max(1, items.length);
  const rowH = Math.min(24, Math.max(18, rowStep - 5));

  items.forEach((item, idx) => {
    const y = startY + idx * rowStep;
    const revealed = ((p * 1.6) % 1) >= idx * 0.12;
    drawRoundedRect(ctx, lx, y, rowW, rowH, 6);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = revealed
      ? item.ok
        ? 'rgba(34, 211, 238, 0.5)'
        : 'rgba(251, 191, 36, 0.55)'
      : BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    const statusText = revealed ? (item.ok ? 'MATCH' : 'MISSING') : 'CHECK';
    const statusMaxW = Math.min(54, rowW * 0.3);
    const skillMaxW = rowW - statusMaxW - 24;

    drawFittedText(ctx, item.name, lx + 10, y + rowH / 2 + 0.5, skillMaxW, {
      weight: 600,
      size: 10,
      minSize: 7.5,
      color: '#F8FAFC',
      align: 'left',
    });

    drawFittedText(ctx, statusText, lx + rowW - 10, y + rowH / 2 + 0.5, statusMaxW, {
      weight: 600,
      size: 9,
      minSize: 7,
      family: '"JetBrains Mono", monospace',
      color: revealed ? (item.ok ? CYAN : AMBER) : '#64748B',
      align: 'right',
    });
  });

  // Right: Sweeping ATS Alignment Arc Gauge
  const rightAreaStart = lx + rowW + 12;
  const gx = rightAreaStart + (w - rightAreaStart) * 0.5;
  const gy = h * 0.5;
  const gr = clamp(Math.min((w - rightAreaStart) * 0.36, h * 0.27), 28, 52);
  const sweepProgress = Math.min(1, ((p * 1.5) % 1) * 1.25);
  const animatedScore = Math.round(score * (0.65 + 0.35 * Math.sin(p * Math.PI)));

  ctx.beginPath();
  ctx.arc(gx, gy, gr, Math.PI * 0.75, Math.PI * 2.25);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
  ctx.lineWidth = Math.max(6, gr * 0.18);
  ctx.lineCap = 'round';
  ctx.stroke();

  const targetAngle = Math.PI * 0.75 + Math.PI * 1.5 * (score / 100) * Math.max(0.55, sweepProgress);
  ctx.beginPath();
  ctx.arc(gx, gy, gr, Math.PI * 0.75, targetAngle);
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = Math.max(6, gr * 0.18);
  ctx.lineCap = 'round';
  ctx.stroke();

  drawFittedText(ctx, `${animatedScore}%`, gx, gy - 4, gr * 1.4, {
    weight: 700,
    size: 22,
    minSize: 13,
    family: '"Bricolage Grotesque", sans-serif',
    color: '#FFFFFF',
  });

  drawFittedText(ctx, 'ATS FIT', gx, gy + 15, gr * 1.35, {
    weight: 600,
    size: 8.5,
    minSize: 6.5,
    family: '"JetBrains Mono", monospace',
    color: ICE,
  });
}

// 5. Smart Job Matching Kinetic Vector Reel
function renderJobMatching(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const skills = (data.alignedSkills ?? ['TypeScript', 'React', 'Node.js', 'PostgreSQL']).slice(0, 4);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const score = data.matchScore ?? 94;
  const coreR = clamp(Math.min(w * 0.11, h * 0.2), 22, 30) + Math.sin(p * Math.PI * 6) * 1.5;

  const sx = clamp(w * 0.04, 8, 24);
  const maxTagW = clamp(cx - coreR - sx - 18, 58, 120);

  skills.forEach((sk, idx) => {
    const sy = h * (0.18 + idx * 0.21);
    const boxW = drawTag(ctx, sx, sy - 11, sk, CYAN, 'rgba(34, 211, 238, 0.1)', maxTagW);
    const start: [number, number] = [sx + boxW, sy];
    const cp1: [number, number] = [sx + boxW + (cx - coreR - (sx + boxW)) * 0.5, sy];
    const cp2: [number, number] = [cx - coreR - 14, cy];
    const end: [number, number] = [cx - coreR, cy];

    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const tPos = (p * 2.4 + idx * 0.22) % 1;
    const [px, py] = pointOnCubic(start, cp1, cp2, end, tPos);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = CYAN;
    ctx.fill();
  });

  // Right: 2 Target Job Nodes
  const targets = [
    data.roleTitle ?? 'Senior Product Engineer',
    data.company ?? 'Northstar Cloud',
  ];
  const targetBoxW = clamp(w * 0.31, 84, 170);
  const tx = w - targetBoxW - sx;
  const boxH = clamp(h * 0.18, 26, 34);

  targets.forEach((label, idx) => {
    const ty = h * (0.34 + idx * 0.32);
    const start: [number, number] = [cx + coreR, cy];
    const cp1: [number, number] = [cx + coreR + 16, cy];
    const cp2: [number, number] = [tx - (tx - (cx + coreR)) * 0.5, ty];
    const end: [number, number] = [tx, ty];

    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
    ctx.strokeStyle = idx === 0 ? 'rgba(34, 211, 238, 0.65)' : 'rgba(167, 139, 250, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    drawRoundedRect(ctx, tx, ty - boxH / 2, targetBoxW, boxH, 8);
    ctx.fillStyle = '#0D1A2F';
    ctx.fill();
    ctx.strokeStyle = idx === 0 ? CYAN : VIOLET;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFittedText(ctx, label, tx + targetBoxW / 2, ty + 0.5, targetBoxW - 14, {
      weight: 600,
      size: 10,
      minSize: 7.5,
      color: '#F8FAFC',
    });
  });

  // Center Resonance Core
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = '#091426';
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawFittedText(ctx, `${score}%`, cx, cy + 0.5, coreR * 1.5, {
    weight: 700,
    size: 12.5,
    minSize: 9,
    family: '"JetBrains Mono", monospace',
    color: '#FFFFFF',
  });
}

// 6. Recruitment Pipeline Stage Flow Reel
function renderRecruitmentPipeline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const stages = [
    { name: 'Job Req', count: '1' },
    { name: 'Applied', count: '1,240' },
    { name: 'Screen', count: '418' },
    { name: 'Shortlist', count: '142' },
    { name: 'Assess', count: '76' },
    { name: 'Interview', count: '28' },
    { name: 'Offers', count: '12' },
  ];
  const activeIdx = data.activeStageIdx ?? Math.floor((p * 7) % 7);
  const padX = clamp(w * 0.04, 10, 28);
  const colW = (w - padX * 2) / stages.length;

  const lineY = h * 0.56;
  ctx.beginPath();
  ctx.moveTo(padX + colW * 0.5, lineY);
  ctx.lineTo(padX + colW * (stages.length - 0.5), lineY);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const pulseX = padX + colW * 0.5 + ((p * 2) % 1) * (colW * (stages.length - 1));
  const grad = ctx.createLinearGradient(pulseX - 60, 0, pulseX + 20, 0);
  grad.addColorStop(0, 'rgba(34, 211, 238, 0)');
  grad.addColorStop(0.7, CYAN);
  grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
  ctx.beginPath();
  ctx.moveTo(Math.max(padX + colW * 0.5, pulseX - 60), lineY);
  ctx.lineTo(Math.min(padX + colW * (stages.length - 0.5), pulseX + 20), lineY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.stroke();

  stages.forEach((st, idx) => {
    const cx = padX + idx * colW + colW * 0.5;
    const barW = clamp(colW * 0.52, 16, 30);
    const barH = Math.max(16, h * 0.33 * (1 - idx * 0.11));
    const isCurrent = idx === activeIdx;

    drawRoundedRect(ctx, cx - barW / 2, lineY - barH - 12, barW, barH, 5);
    ctx.fillStyle = isCurrent ? 'rgba(34, 211, 238, 0.25)' : 'rgba(147, 197, 253, 0.1)';
    ctx.fill();
    ctx.strokeStyle = isCurrent ? CYAN : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = isCurrent ? 1.5 : 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, lineY, isCurrent ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? CYAN : '#1E293B';
    ctx.fill();
    ctx.strokeStyle = isCurrent ? '#FFFFFF' : CYAN;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawFittedText(ctx, st.name, cx, lineY + 18, colW - 4, {
      weight: 600,
      size: 9.5,
      minSize: 7,
      color: isCurrent ? '#FFFFFF' : '#94A3B8',
    });

    drawFittedText(ctx, st.count, cx, lineY + 34, colW - 4, {
      weight: 700,
      size: 10,
      minSize: 7,
      family: '"JetBrains Mono", monospace',
      color: isCurrent ? CYAN : '#CBD5E1',
    });
  });
}

// 7. AI Interview Live Acoustic & Rubric Reel
function renderAiInterview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const speaker = data.speaker ?? (Math.sin(p * Math.PI * 2) > 0 ? 'ai' : 'candidate');
  const cx = clamp(w * 0.22, 48, 140);
  const cy = h * 0.48;
  const maxRingR = Math.min(cx - 10, h * 0.42);
  const coreR = clamp(maxRingR * 0.36, 15, 22);

  for (let r = 0; r < 3; r++) {
    const stepR = (maxRingR - coreR) / 3;
    const radius = coreR + 6 + r * stepR + Math.sin(p * Math.PI * 8 - r * 0.9) * 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = speaker === 'ai'
      ? `rgba(34, 211, 238, ${0.55 - r * 0.15})`
      : `rgba(167, 139, 250, ${0.45 - r * 0.12})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = '#0D1B30';
  ctx.fill();
  ctx.strokeStyle = speaker === 'ai' ? CYAN : VIOLET;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawFittedText(ctx, speaker === 'ai' ? 'AI' : 'USER', cx, cy + 0.5, coreR * 1.4, {
    weight: 700,
    size: 9.5,
    minSize: 7.5,
    family: '"JetBrains Mono", monospace',
    color: '#FFFFFF',
  });

  // Waveform Equalizer Right Side (strictly bounded inside rightStart..w-12)
  const rightStart = cx + maxRingR + clamp(w * 0.04, 14, 28);
  const rightSpan = Math.max(100, w - rightStart - 12);
  const waveY = h * 0.34;
  const barStep = 7;
  const bars = Math.max(10, Math.min(28, Math.floor(rightSpan / barStep)));

  for (let i = 0; i < bars; i++) {
    const amp = 7 + Math.abs(Math.sin(p * Math.PI * 10 + i * 0.55)) * clamp(h * 0.15, 16, 28);
    const bx = rightStart + i * barStep;
    drawRoundedRect(ctx, bx, waveY - amp / 2, 3.5, amp, 2);
    ctx.fillStyle = i % 3 === 0 ? CYAN : ICE;
    ctx.fill();
  }

  // Live Evaluation Rubric Bars (strictly bounded inside rightStart..w-12)
  const rubrics = [
    { label: 'Systems Architecture', score: 0.92 },
    { label: 'Execution Ownership', score: 0.89 },
    { label: 'Communication', score: 0.9 },
  ];
  const labelW = clamp(rightSpan * 0.54, 72, 135);
  const barX = rightStart + labelW + 8;
  const barW = Math.max(32, rightSpan - labelW - 8);

  rubrics.forEach((rb, idx) => {
    const ry = h * 0.58 + idx * clamp(h * 0.13, 20, 26);
    drawFittedText(ctx, rb.label, rightStart, ry, labelW, {
      weight: 500,
      size: 9.5,
      minSize: 7.5,
      color: '#CBD5E1',
      align: 'left',
    });

    drawRoundedRect(ctx, barX, ry - 4, barW, 8, 4);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.fill();

    const animatedW = barW * rb.score * (0.8 + 0.2 * Math.sin(p * Math.PI * 2 + idx));
    drawRoundedRect(ctx, barX, ry - 4, animatedW, 8, 4);
    ctx.fillStyle = idx === 1 ? VIOLET : CYAN;
    ctx.fill();
  });
}

// 8. Campus Hiring Topology Reel (1 Recruiter -> 3 Colleges -> 7 Branches)
function renderCampusHiring(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  data: ModuleVideoContext,
) {
  const colleges = ['NIT Pune', 'Apex BLR', 'Meridian HYD'];
  const branches = ['CE', 'IT', 'AI&DS', 'ECE', 'EEE', 'ME', 'Civil'];
  const cgpa = data.minCgpa ?? 7.5;

  // Row 1: Recruiter Hub
  const hubX = w * 0.5;
  const hubY = h * 0.16;
  const hubW = clamp(w * 0.34, 128, 178);
  const hubH = 26;

  drawRoundedRect(ctx, hubX - hubW / 2, hubY - hubH / 2, hubW, hubH, 7);
  ctx.fillStyle = '#0F2442';
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawFittedText(ctx, '1 Recruiter Command Hub', hubX, hubY + 0.5, hubW - 14, {
    weight: 700,
    size: 10.5,
    minSize: 8,
    color: '#FFFFFF',
  });

  // Row 2: 3 Partner Colleges
  const colY = h * 0.45;
  const colBoxW = clamp((w * 0.86) / 3 - 8, 74, 120);
  const colBoxH = 26;
  const colPositions = [w * 0.2, w * 0.5, w * 0.8];

  colleges.forEach((colName, idx) => {
    const cx = clamp(colPositions[idx], colBoxW / 2 + 8, w - colBoxW / 2 - 8);
    ctx.beginPath();
    ctx.moveTo(hubX, hubY + hubH / 2);
    ctx.bezierCurveTo(hubX, hubY + 28, cx, colY - 28, cx, colY - colBoxH / 2);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const [px, py] = pointOnCubic(
      [hubX, hubY + hubH / 2],
      [hubX, hubY + 28],
      [cx, colY - 28],
      [cx, colY - colBoxH / 2],
      (p * 2.5 + idx * 0.3) % 1,
    );
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = CYAN;
    ctx.fill();

    drawRoundedRect(ctx, cx - colBoxW / 2, colY - colBoxH / 2, colBoxW, colBoxH, 7);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = ICE;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    drawFittedText(ctx, colName, cx, colY + 0.5, colBoxW - 10, {
      weight: 600,
      size: 10,
      minSize: 7.5,
      color: '#E2E8F0',
    });
  });

  // Row 3: 7 Academic Branches + CGPA Gate
  const brY = h * 0.74;
  const brSpan = w - 20;
  const brColW = brSpan / branches.length;
  const brBoxW = clamp(brColW - 6, 28, 52);
  const brBoxH = 26;

  branches.forEach((br, idx) => {
    const bx = 10 + idx * brColW + brColW * 0.5;
    const parentIdx = Math.min(2, Math.floor((idx * 3) / branches.length));
    const parentCx = clamp(colPositions[parentIdx], colBoxW / 2 + 8, w - colBoxW / 2 - 8);

    ctx.beginPath();
    ctx.moveTo(parentCx, colY + colBoxH / 2);
    ctx.lineTo(bx, brY - brBoxH / 2);
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.38)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    const active =
      data.selectedBranchName === 'all' ||
      !data.selectedBranchName ||
      data.selectedBranchName.includes(br);
    drawRoundedRect(ctx, bx - brBoxW / 2, brY - brBoxH / 2, brBoxW, brBoxH, 6);
    ctx.fillStyle = active ? '#0D1E38' : '#070C17';
    ctx.fill();
    ctx.strokeStyle = active ? CYAN : BORDER;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    drawFittedText(ctx, br, bx, brY + 0.5, brBoxW - 6, {
      weight: 700,
      size: 9.5,
      minSize: 7,
      family: '"JetBrains Mono", monospace',
      color: active ? '#FFFFFF' : '#64748B',
    });
  });

  // CGPA Gate Badge — top-right on wide canvas, bottom-center on compact width so it never touches the Hub box
  const cgpaText = `CGPA >= ${cgpa.toFixed(1)} · ${(data.eligibleStudents ?? 2142).toLocaleString()} Eligible`;
  if (w >= 540) {
    drawFittedText(ctx, cgpaText, w - 16, h * 0.14, w * 0.28, {
      weight: 600,
      size: 9.5,
      minSize: 7.5,
      family: '"JetBrains Mono", monospace',
      color: 'rgba(34, 211, 238, 0.9)',
      align: 'right',
    });
  } else {
    drawFittedText(ctx, cgpaText, w * 0.5, h * 0.92, w - 24, {
      weight: 600,
      size: 9,
      minSize: 7.5,
      family: '"JetBrains Mono", monospace',
      color: 'rgba(34, 211, 238, 0.9)',
      align: 'center',
    });
  }
}

// 9-11. Solutions Role Reels (Candidate / Recruiter / College & TPO)
function renderPersonaFlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  role: 'persona-candidate' | 'persona-recruiter' | 'persona-college',
) {
  const stepsByRole = {
    'persona-candidate': ['Upload PDF', 'ATS Check', 'Role Match', 'AI Interview'],
    'persona-recruiter': ['Publish Req', 'AI Rank', 'Panel Screen', 'Release Offer'],
    'persona-college': ['Import Roster', 'Verify CGPA', 'Track Rounds', 'Placement Ledger'],
  };
  const labels = stepsByRole[role];
  const color = role === 'persona-candidate' ? CYAN : role === 'persona-recruiter' ? ICE : VIOLET;
  const activeStep = Math.floor((p * 4) % 4);
  const padX = 10;
  const colW = (w - padX * 2) / labels.length;
  const boxW = clamp(colW - 6, 54, 92);
  const startX = padX + colW * 0.5;
  const endX = w - padX - colW * 0.5;
  const y = h * 0.6;

  // Track
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Active sweep packet
  const px = startX + ((p * 2) % 1) * (endX - startX);
  ctx.beginPath();
  ctx.arc(px, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  labels.forEach((lbl, idx) => {
    const nx = padX + idx * colW + colW * 0.5;
    const active = idx === activeStep;
    drawRoundedRect(ctx, nx - boxW / 2, y - 42, boxW, 28, 7);
    ctx.fillStyle = active ? '#0F2442' : CARD_BG;
    ctx.fill();
    ctx.strokeStyle = active ? color : BORDER;
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.stroke();

    drawFittedText(ctx, lbl, nx, y - 27.5, boxW - 10, {
      weight: 600,
      size: 9.5,
      minSize: 7,
      color: active ? '#FFFFFF' : '#CBD5E1',
    });

    ctx.beginPath();
    ctx.arc(nx, y, active ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = active ? color : '#1E293B';
    ctx.fill();
  });
}

export function drawModuleVideoFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  role: ModuleVideoRole,
  progress: number,
  contextData: ModuleVideoContext,
) {
  drawBackdropGrid(ctx, w, h);

  switch (role) {
    case 'fragmented-hiring':
      renderFragmentedHiring(ctx, w, h, progress, contextData);
      break;
    case 'ecosystem':
      renderEcosystem(ctx, w, h, progress, contextData);
      break;
    case 'resume-analysis':
      renderResumeAnalysis(ctx, w, h, progress, contextData);
      break;
    case 'ats-checker':
      renderAtsChecker(ctx, w, h, progress, contextData);
      break;
    case 'job-matching':
      renderJobMatching(ctx, w, h, progress, contextData);
      break;
    case 'recruitment-pipeline':
      renderRecruitmentPipeline(ctx, w, h, progress, contextData);
      break;
    case 'ai-interview':
      renderAiInterview(ctx, w, h, progress, contextData);
      break;
    case 'campus-hiring':
      renderCampusHiring(ctx, w, h, progress, contextData);
      break;
    case 'persona-candidate':
    case 'persona-recruiter':
    case 'persona-college':
      renderPersonaFlow(ctx, w, h, progress, role);
      break;
  }
}
