'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useApplyToJob } from '../hooks/useJobs';
import { UnifiedJob } from '../types/Index';

// ── Source configuration ──────────────────────────────────────────────────────

type JobSource = 'internal' | 'serpapi';

const SOURCE_CONFIG: Record<JobSource, {
  label: string;
  color: string;
  bg: string;
  badge: string;
  badgeColor: string;
}> = {
  internal: {
    label:      'Direct Apply',
    color:      '#10B981',
    bg:         'rgba(16,185,129,0.1)',
    badge:      '✦ Platform Job',
    badgeColor: '#10B981',
  },
  serpapi: {
    label:      'View on Google Jobs',
    color:      '#38BDF8',
    bg:         'rgba(56,189,248,0.1)',
    badge:      '⊕ Google Jobs',
    badgeColor: '#38BDF8',
  },
};

const WORK_MODE_ICONS: Record<string, string> = {
  remote: '🌍',
  hybrid: '🏢',
  onsite: '📍',
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (!min && !max) return 'Salary not disclosed';

  const fmt = (n: number): string =>
    n >= 100_000
      ? `${(n / 100_000).toFixed(0)}L`
      : `${(n / 1_000).toFixed(0)}K`;

  const symbol = currency === 'INR' ? '₹' : '$';

  if (min && max) return `${symbol}${fmt(min)}–${fmt(max)}`;
  if (max)        return `Up to ${symbol}${fmt(max)}`;
  return `${symbol}${fmt(min!)}+`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor(diff / 60_000);

  if (days > 30)  return `${Math.floor(days / 30)}mo ago`;
  if (days > 0)   return `${days}d ago`;
  if (hours > 0)  return `${hours}h ago`;
  return `${mins}m ago`;
}

// ── Style factories ───────────────────────────────────────────────────────────
// Extracted outside JSX to eliminate duplicate-property risk and
// keep render logic clean — addresses ts(1117) error.

function getApplyButtonStyle(
  applied: boolean,
  isPending: boolean,
  cfg: typeof SOURCE_CONFIG[JobSource],
): React.CSSProperties {
  // Single, authoritative border declaration — no duplication possible
  const borderValue = applied
    ? '1px solid rgba(16,185,129,0.25)'
    : `1px solid ${cfg.color}33`;

  return {
    marginLeft:   'auto',
    padding:      '8px 18px',
    borderRadius: '8px',
    fontSize:     '12px',
    fontWeight:   600,
    cursor:       applied || isPending ? 'default' : 'pointer',
    border:       borderValue,           // ✅ defined exactly once
    background:   applied ? 'rgba(16,185,129,0.15)' : cfg.bg,
    color:        applied ? '#10B981' : cfg.color,
    opacity:      isPending ? 0.7 : 1,
    transition:   'all 0.15s ease',
  };
}

function getCardStyle(hovered: boolean): React.CSSProperties {
  return {
    background:   '#0D1424',
    border:       hovered
      ? '1px solid rgba(255,255,255,0.15)'
      : '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding:      '1.25rem',
    transition:   'border-color 0.15s ease',
    position:     'relative',
    overflow:     'hidden',
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface JobCardProps {
  job:             UnifiedJob;
  activeResumeId?: string;
  applied?:        boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JobCard({
  job,
  activeResumeId,
  applied = false,
}: JobCardProps) {
  const { user }                        = useAuth();
  const { mutate: apply, isPending }    = useApplyToJob();
  const [expanded, setExpanded]         = useState(false);
  const [hovered,  setHovered]          = useState(false);

  const cfg = SOURCE_CONFIG[job.source as JobSource] ?? SOURCE_CONFIG.serpapi;

  // ── Action handler ──────────────────────────────────────────────────────────

  function handleApply() {
    // External job — open in new tab, no internal tracking
    if (job.source === 'serpapi' && job.applyUrl) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!activeResumeId) {
      alert('Please upload a resume before applying');
      return;
    }

    apply({ jobId: job.id, resumeId: activeResumeId });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={getCardStyle(hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Match score accent bar — only shown when score exists */}
      {job.matchScore != null && job.matchScore > 0 && (
        <div
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            width:      `${job.matchScore}%`,
            height:     '2px',
            background: job.matchScore >= 70
              ? 'linear-gradient(90deg, #10B981, #34D399)'
              : 'linear-gradient(90deg, #F59E0B, #FCD34D)',
          }}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}

      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   '10px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '8px',
            marginBottom:'4px',
            flexWrap:    'wrap',
          }}>
            <h3 style={{
              fontSize:   '14px',
              fontWeight:  600,
              color:      '#F1F5F9',
              margin:      0,
            }}>
              {job.title}
            </h3>

            {/* Source badge */}
            <span style={{
              fontSize:   '10px',
              padding:    '2px 7px',
              borderRadius:'20px',
              background:  cfg.bg,
              color:       cfg.badgeColor,
              border:      `1px solid ${cfg.badgeColor}33`,
              fontFamily: 'monospace',
              flexShrink:  0,
            }}>
              {cfg.badge}
            </span>
          </div>

          <p style={{
            fontSize: '13px',
            color:    'rgba(255,255,255,0.45)',
            margin:    0,
          }}>
            {job.company}
            {job.location && ` · ${job.location}`}
          </p>
        </div>

        {/* Match score indicator */}
        {job.matchScore != null && job.matchScore > 0 && (
          <div style={{
            textAlign:   'center',
            flexShrink:   0,
            marginLeft:  '12px',
          }}>
            <div style={{
              fontSize:   '15px',
              fontWeight:  700,
              color:      job.matchScore >= 70 ? '#10B981' : '#F59E0B',
              fontFamily: 'monospace',
            }}>
              {job.matchScore}%
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
              match
            </div>
          </div>
        )}
      </div>

      {/* ── Meta chips ─────────────────────────────────────────────────────── */}

      <div style={{
        display:      'flex',
        gap:          '8px',
        flexWrap:     'wrap',
        marginBottom: '12px',
        alignItems:   'center',
      }}>
        {job.workMode && (
          <span style={{
            fontSize:     '11px',
            padding:      '3px 8px',
            borderRadius: '6px',
            background:   'rgba(255,255,255,0.05)',
            color:        'rgba(255,255,255,0.5)',
          }}>
            {WORK_MODE_ICONS[job.workMode] ?? '🏢'} {job.workMode}
          </span>
        )}

        {job.employmentType && (
          <span style={{
            fontSize:     '11px',
            padding:      '3px 8px',
            borderRadius: '6px',
            background:   'rgba(255,255,255,0.05)',
            color:        'rgba(255,255,255,0.5)',
          }}>
            {job.employmentType.replace('_', ' ')}
          </span>
        )}

        <span style={{
          fontSize:     '11px',
          padding:      '3px 8px',
          borderRadius: '6px',
          background:   'rgba(16,185,129,0.08)',
          color:        '#10B981',
        }}>
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
        </span>

        <span style={{
          fontSize:    '11px',
          color:       'rgba(255,255,255,0.25)',
          marginLeft:  'auto',
        }}>
          {timeAgo(job.postedAt)}
        </span>
      </div>

      {/* ── Required skills ────────────────────────────────────────────────── */}

      {job.requiredSkills?.length > 0 && (
        <div style={{
          display:      'flex',
          gap:          '5px',
          flexWrap:     'wrap',
          marginBottom: '12px',
        }}>
          {job.requiredSkills.slice(0, 5).map(skill => (
            <span
              key={skill}
              style={{
                fontSize:     '10px',
                padding:      '2px 7px',
                borderRadius: '4px',
                background:   'rgba(56,189,248,0.08)',
                border:       '1px solid rgba(56,189,248,0.15)',
                color:        '#38BDF8',
                fontFamily:   'monospace',
              }}
            >
              {skill}
            </span>
          ))}

          {job.requiredSkills.length > 5 && (
            <span style={{
              fontSize: '10px',
              color:    'rgba(255,255,255,0.25)',
              padding:  '2px 0',
            }}>
              +{job.requiredSkills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* ── Description (expandable) ────────────────────────────────────────── */}

      {job.description && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            fontSize:              '12px',
            color:                 'rgba(255,255,255,0.4)',
            lineHeight:             1.6,
            margin:                 0,
            display:               '-webkit-box',
            WebkitLineClamp:        expanded ? 'unset' : 2,
            WebkitBoxOrient:       'vertical',
            overflow:              'hidden',
          }}>
            {job.description}
          </p>

          {job.description.length > 150 && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{
                fontSize:   '11px',
                color:      '#38BDF8',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    '2px 0',
                marginTop:  '4px',
              }}
            >
              {expanded ? 'Show less ↑' : 'Show more ↓'}
            </button>
          )}
        </div>
      )}

      {/* ── Footer: applicant count + CTA ───────────────────────────────────── */}

      <div style={{
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
      }}>
        {job.source === 'internal' && (
          <span style={{
            fontSize: '11px',
            color:    'rgba(255,255,255,0.25)',
          }}>
            {job.applicantCount} applicant
            {job.applicantCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Only candidates see the apply button */}
        {user?.role === 'candidate' && (
          <button
            onClick={handleApply}
            disabled={isPending || applied}
            style={getApplyButtonStyle(applied, isPending, cfg)}
          >
            {isPending
              ? 'Applying…'
              : applied
              ? '✓ Applied'
              : cfg.label}
          </button>
        )}
      </div>
    </div>
  );
}