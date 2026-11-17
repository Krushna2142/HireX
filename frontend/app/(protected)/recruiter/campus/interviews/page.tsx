'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { campusApi, type CampusApplicantRow, type CampusDrive } from '@/lib/axios';
import {
  C, CampusPage, Empty, Err, SkeletonRows, StatusPill, EligibilityPill,
  panelStyle, inputStyle, smallBtn, tbl, tblWrap, thStyle, tdStyle,
} from '@/app/_components/campus/kit';

const INTERVIEWISH = ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_PASSED', 'INTERVIEW_FAILED'];

function Board() {
  const params = useSearchParams();
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [driveId, setDriveId] = useState(params.get('drive') ?? '');
  const [rows, setRows] = useState<CampusApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!driveId) { setRows([]); return; }
    setLoading(true); setError('');
    try {
      const { data } = await campusApi.applicants(driveId, { limit: 200 });
      setRows((data.applicants ?? []).filter((a: CampusApplicantRow) =>
        INTERVIEWISH.includes(a.status) || !!a.campusDetail?.currentRoundKey));
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to load.'); }
    finally { setLoading(false); }
  }, [driveId]);

  useEffect(() => { campusApi.myDrives().then((r) => { setDrives(r.data ?? []); if (!driveId && r.data?.length) setDriveId(r.data[0].id); }).catch(() => {}); }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...panelStyle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={driveId} onChange={(e) => setDriveId(e.target.value)} style={{ ...inputStyle, maxWidth: 320 }}>
          {drives.length === 0 && <option value="">No drives</option>}
          {drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <Link href="/recruiter/interviews" style={{ ...smallBtn, color: C.sky, textDecoration: 'none', marginLeft: 'auto' }}>Open interview workspace →</Link>
      </div>
      {error && <Err message={error} onRetry={() => void load()} />}
      {loading ? <SkeletonRows rows={4} /> : rows.length === 0 ? (
        <Empty icon="📅" title="No interviews in this drive yet" body="Shortlist candidates and schedule rounds from the Applicants page." action={<Link href={`/recruiter/campus/applicants${driveId ? `?drive=${driveId}` : ''}`} style={smallBtn}>Go to applicants</Link>} />
      ) : (
        <div style={tblWrap}>
          <table style={tbl}>
            <thead><tr><th style={thStyle}>Candidate</th><th style={thStyle}>College / Branch</th><th style={thStyle}>Eligibility</th><th style={thStyle}>Stage</th><th style={thStyle}>Current round</th><th style={thStyle}>Manage</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const s = r.candidate.campusStudents?.[0];
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}><strong style={{ color: C.text }}>{r.candidate.fullName ?? r.candidate.email}</strong></td>
                    <td style={tdStyle}>{s?.college?.name ?? '—'}<div style={{ fontSize: 11, color: C.faint }}>{s?.branch?.name}</div></td>
                    <td style={tdStyle}>{r.campusDetail ? <EligibilityPill status={r.campusDetail.eligibilityStatus} /> : '—'}</td>
                    <td style={tdStyle}><StatusPill status={r.status} /></td>
                    <td style={tdStyle}>{r.campusDetail?.currentRoundKey ?? '—'}</td>
                    <td style={tdStyle}><Link href="/recruiter/interviews" style={{ ...smallBtn, textDecoration: 'none' }}>Rounds / room</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CampusInterviewsPage() {
  return (
    <CampusPage title="Campus Interviews" subtitle="Round-level tracking for campus candidates. Scheduling, rooms and feedback live in the interview workspace.">
      <Suspense fallback={null}><Board /></Suspense>
    </CampusPage>
  );
}