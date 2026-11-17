'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { campusApi, type CampusDrive, type DriveStatus } from '@/lib/axios';
import {
  C, CampusPage, DriveStatusPill, Empty, Err, SkeletonRows, fmtDate,
  panelStyle, primaryBtn, secondaryBtn, smallBtn, tbl, tblWrap, thStyle, tdStyle,
} from '@/app/_components/campus/kit';

export default function CampusDrivesPage() {
  const [drives, setDrives] = useState<CampusDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await campusApi.myDrives(); setDrives(data ?? []); }
    catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to load drives.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (d: CampusDrive, status: DriveStatus) => {
    setBusyId(d.id);
    try { await campusApi.setDriveStatus(d.id, status); toast.success(`Drive ${status.toLowerCase()}.`); await load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Status change failed.'); }
    finally { setBusyId(null); }
  };
  const publish = async (d: CampusDrive) => {
    setBusyId(d.id);
    try { await campusApi.publishDrive(d.id); toast.success('Drive published.'); await load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Publish failed — check colleges, dates and eligibility.'); }
    finally { setBusyId(null); }
  };

  return (
    <CampusPage title="My Campus Drives" subtitle="Every drive your company owns, with visibility and pipeline status."
      actions={<><Link href="/recruiter/campus/create" style={primaryBtn}>+ Create Drive</Link><button type="button" onClick={() => void load()} style={secondaryBtn}>Refresh</button></>}>
      {error && <div style={{ marginBottom: 14 }}><Err message={error} onRetry={() => void load()} /></div>}
      {loading ? <SkeletonRows rows={5} /> : drives.length === 0 ? (
        <Empty icon="🎓" title="No drives yet" body="Create your first campus hiring drive." action={<Link href="/recruiter/campus/create" style={primaryBtn}>Create drive</Link>} />
      ) : (
        <div style={tblWrap}>
          <table style={tbl}>
            <thead><tr>
              <th style={thStyle}>Drive</th><th style={thStyle}>Status</th><th style={thStyle}>Colleges</th>
              <th style={thStyle}>Applications</th><th style={thStyle}>Window</th><th style={thStyle}>Actions</th>
            </tr></thead>
            <tbody>
              {drives.map((d) => (
                <tr key={d.id}>
                  <td style={tdStyle}><strong style={{ color: C.text }}>{d.title}</strong><div style={{ fontSize: 11, color: C.faint }}>{d.job?.title} · {d.vacancies} vacancies</div></td>
                  <td style={tdStyle}><DriveStatusPill status={d.status} /></td>
                  <td style={tdStyle}>{d.colleges?.length ?? 0}</td>
                  <td style={tdStyle}>{d.job?.applicantCount ?? 0}</td>
                  <td style={tdStyle}>{fmtDate(d.applicationOpenAt)} → {fmtDate(d.applicationCloseAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link href={`/recruiter/campus/applicants?drive=${d.id}`} style={{ ...smallBtn, textDecoration: 'none' }}>Applicants</Link>
                      <Link href={`/recruiter/campus/analytics?drive=${d.id}`} style={{ ...smallBtn, textDecoration: 'none' }}>Analytics</Link>
                      <Link href={`/recruiter/campus/offers?drive=${d.id}`} style={{ ...smallBtn, textDecoration: 'none' }}>Offers</Link>
                      {(d.status === 'DRAFT' || d.status === 'PENDING_APPROVAL') && (
                        <button type="button" disabled={busyId === d.id} onClick={() => void publish(d)} style={{ ...smallBtn, color: C.green }}>{busyId === d.id ? '…' : 'Publish'}</button>
                      )}
                      {d.status === 'PUBLISHED' && (
                        <button type="button" disabled={busyId === d.id} onClick={() => void setStatus(d, 'CLOSED')} style={{ ...smallBtn, color: C.orange }}>Close</button>
                      )}
                      {d.status === 'CLOSED' && (
                        <button type="button" disabled={busyId === d.id} onClick={() => void setStatus(d, 'COMPLETED')} style={{ ...smallBtn, color: C.purple }}>Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CampusPage>
  );
}