'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { campusApi, type CampusDrive } from '@/lib/axios';
import {
  C, CampusPage, StatCard, DriveStatusPill, Empty, Err, SkeletonRows,
  panelStyle, primaryBtn, secondaryBtn, smallBtn, tbl, tblWrap, thStyle, tdStyle, fmtDate,
} from '@/app/_components/campus/kit';

type Overview = { drives: number; published: number; applications: number; offers: number; accepted: number; byStatus: Record<string, number> };

export default function CampusOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [o, d] = await Promise.all([campusApi.recruiterOverview(), campusApi.myDrives()]);
      setOverview(o.data as Overview); setDrives(d.data ?? []);
    } catch (e: any) { setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load campus overview.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <CampusPage title="Campus Hiring Overview" subtitle="Company-wide view of your campus drives, applications and offers."
      actions={<><Link href="/recruiter/campus/create" style={primaryBtn}>+ Create Campus Drive</Link><button type="button" onClick={() => void load()} style={secondaryBtn}>Refresh</button></>}>
      {error && <div style={{ marginBottom: 14 }}><Err message={error} onRetry={() => void load()} /></div>}
      {loading ? <SkeletonRows rows={3} height={90} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 18 }}>
            <StatCard label="Drives" value={overview?.drives ?? 0} color={C.purple} />
            <StatCard label="Published" value={overview?.published ?? 0} color={C.green} />
            <StatCard label="Applications" value={overview?.applications ?? 0} color={C.sky} />
            <StatCard label="Offers" value={overview?.offers ?? 0} color={C.yellow} />
            <StatCard label="Accepted / Joined" value={overview?.accepted ?? 0} color={C.green} />
          </div>
          <div style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontSize: 14 }}>Recent drives</strong>
              <Link href="/recruiter/campus/drives" style={{ ...smallBtn, color: C.sky, textDecoration: 'none' }}>View all →</Link>
            </div>
            {drives.length === 0 ? (
              <Empty icon="🎓" title="No campus drives yet" body="Create your first drive to start hiring from colleges." action={<Link href="/recruiter/campus/create" style={primaryBtn}>Create drive</Link>} />
            ) : (
              <div style={tblWrap}>
                <table style={tbl}>
                  <thead><tr><th style={thStyle}>Drive</th><th style={thStyle}>Status</th><th style={thStyle}>Colleges</th><th style={thStyle}>Window</th><th style={thStyle}></th></tr></thead>
                  <tbody>
                    {drives.slice(0, 6).map((d) => (
                      <tr key={d.id}>
                        <td style={tdStyle}><strong style={{ color: C.text }}>{d.title}</strong><div style={{ fontSize: 11, color: C.faint }}>{d.job?.title}</div></td>
                        <td style={tdStyle}><DriveStatusPill status={d.status} /></td>
                        <td style={tdStyle}>{d.colleges?.length ?? 0}</td>
                        <td style={tdStyle}>{fmtDate(d.applicationOpenAt)} → {fmtDate(d.applicationCloseAt)}</td>
                        <td style={tdStyle}><Link href={`/recruiter/campus/applicants?drive=${d.id}`} style={{ ...smallBtn, textDecoration: 'none' }}>Applicants</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </CampusPage>
  );
}