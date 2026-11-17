'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
// Recruiter-facing applicant management: filters, bulk actions, batch progress,
// details / schedule-interview / release-offer modals. Reused by Applicants + Shortlisted.
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Pagination from '@/components/jobs/Pagination';
import {
  campusApi, type CampusApplicantRow, type CampusBatch, type CampusDrive,
} from '@/lib/axios';
import {
  C, BatchProgress, EligibilityPill, Empty, Err, Modal, Field, StatusPill, OfferPill,
  SkeletonRows, fmtDate, num, inputStyle, primaryBtn, secondaryBtn, dangerBtn, smallBtn,
  tbl, tblWrap, thStyle, tdStyle, labelStyle,
} from './kit';

const PAGE_SIZE = 25;

type Snap = { reasons?: string[]; missingFields?: string[]; checks?: Array<{ label: string; state: string; message: string }> };
const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)', // Matches the dark slate panels used in the app
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 16,
  padding: '1.25rem',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};
export default function ApplicantsBoard({
  drive, presetStatus,
}: { drive: CampusDrive | null; presetStatus?: string }) {
  const [rows, setRows] = useState<CampusApplicantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(presetStatus ?? '');
  const [elig, setElig] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<CampusBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<CampusApplicantRow | null>(null);
  const [scheduleFor, setScheduleFor] = useState<CampusApplicantRow | null>(null);
  const [offerFor, setOfferFor] = useState<CampusApplicantRow | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('Campus drive update');
  const [notifyMsg, setNotifyMsg] = useState('');
  const [sched, setSched] = useState({ roundType: 'technical', scheduledAt: '', durationMins: 45, mode: 'video' });
  const [offer, setOffer] = useState({ ctc: '', roleTitle: '', location: '', joiningDate: '', expiresAt: '' });

  const driveId = drive?.id ?? null;

  const load = useCallback(async () => {
    if (!driveId) { setRows([]); setTotal(0); return; }
    setLoading(true); setError('');
    try {
      const { data } = await campusApi.applicants(driveId, {
        page, limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        eligibilityStatus: (elig || undefined) as any,
      });
      setRows(data.applicants ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load applicants.');
    } finally { setLoading(false); }
  }, [driveId, page, search, status, elig]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [driveId, search, status, elig]);

  // Batch polling
  useEffect(() => {
    if (!batchId) return;
    let stop = false;
    const tick = async () => {
      try {
        const { data } = await campusApi.batchStatus(batchId);
        if (stop) return;
        setBatch(data);
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.status)) {
          setBatchId(null);
          if (data.status === 'COMPLETED') toast.success(`Batch complete: ${data.processed} ok, ${data.failed} failed`);
          else toast.error(`Batch ${data.status.toLowerCase()}: ${data.failed} failed`);
          void load();
        }
      } catch { /* keep polling */ }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(t); };
  }, [batchId, load]);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => setSelected(allPageSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const runBulkStatus = async (nextStatus: string, ids?: string[]) => {
    const target = ids ?? [...selected];
    if (!driveId || !target.length) return toast.error('Select applicants first.');
    setBusy(true);
    try {
      const { data } = await campusApi.bulkStatus(driveId, { applicationIds: target, status: nextStatus, notify: true });
      setBatchId(data.batchId); setBatch(null); setSelected(new Set());
      toast.success(`Bulk "${nextStatus}" queued (${data.total}).`);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Bulk action failed.'); }
    finally { setBusy(false); }
  };

  const runNotify = async () => {
    if (!driveId || !selected.size) return toast.error('Select applicants first.');
    if (!notifyMsg.trim()) return toast.error('Message is required.');
    setBusy(true);
    try {
      const { data } = await campusApi.bulkNotify(driveId, { applicationIds: [...selected], title: notifyTitle, message: notifyMsg });
      setBatchId(data.batchId); setNotifyOpen(false); setSelected(new Set());
      toast.success('Notification batch queued.');
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Notify failed.'); }
    finally { setBusy(false); }
  };

  const runExport = async () => {
    if (!driveId) return;
    setBusy(true);
    try {
      const { data } = await campusApi.exportApplicants(driveId);
      setBatchId(data.batchId);
      toast.success('Export queued — download appears when complete.');
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Export failed.'); }
    finally { setBusy(false); }
  };

  const submitSchedule = async () => {
    if (!driveId || !scheduleFor) return;
    if (!sched.scheduledAt) return toast.error('Pick date & time.');
    setBusy(true);
    try {
      await campusApi.scheduleInterview(driveId, scheduleFor.id, {
        roundType: sched.roundType as any,
        scheduledAt: new Date(sched.scheduledAt).toISOString(),
        durationMins: num(sched.durationMins) || 45,
        mode: sched.mode as any,
      });
      toast.success('Interview scheduled & candidate notified.');
      setScheduleFor(null); void load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Scheduling failed.'); }
    finally { setBusy(false); }
  };

  const submitOffer = async () => {
    if (!driveId || !offerFor) return;
    setBusy(true);
    try {
      await campusApi.releaseOffer(driveId, {
        applicationId: offerFor.id,
        ctc: offer.ctc ? num(offer.ctc) : undefined,
        roleTitle: offer.roleTitle || undefined,
        location: offer.location || undefined,
        joiningDate: offer.joiningDate ? new Date(offer.joiningDate).toISOString() : undefined,
        expiresAt: offer.expiresAt ? new Date(offer.expiresAt).toISOString() : undefined,
      });
      toast.success('Offer released.');
      setOfferFor(null); void load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Offer failed.'); }
    finally { setBusy(false); }
  };

  const snap = useMemo<Snap>(() => (details?.campusDetail?.eligibilitySnapshot ?? {}) as Snap, [details]);

  if (!drive) return <Empty icon="🗂️" title="No drive selected" body="Create or select a campus drive to manage applicants." />;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <BatchProgress batch={batch} />
      {error && <Err message={error} onRetry={() => void load()} />}

      {/* Toolbar */}
      <div style={{ ...panelStyle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / email…" style={{ ...inputStyle, maxWidth: 240 }} />
        {!presetStatus && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
            <option value="">All statuses</option>
            <option value="APPLIED">Applied</option><option value="UNDER_REVIEW">Under review</option>
            <option value="SHORTLISTED">Shortlisted</option><option value="INTERVIEW_SCHEDULED">Interview scheduled</option>
            <option value="INTERVIEW_PASSED">Interview passed</option><option value="INTERVIEW_FAILED">Interview failed</option>
            <option value="OFFERED">Offered</option><option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option><option value="ON_HOLD">On hold</option>
          </select>
        )}
        <select value={elig} onChange={(e) => setElig(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Any eligibility</option>
          <option value="ELIGIBLE">Eligible</option><option value="NOT_ELIGIBLE">Not eligible</option><option value="NEEDS_INFO">Needs info</option>
        </select>
        <span style={{ marginLeft: 'auto', color: C.faint, fontSize: 12 }}>{total} applicants · {selected.size} selected</span>
      </div>

      {/* Bulk bar */}
      <div style={{ ...panelStyle, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={labelStyle}>Bulk:</span>
        <button type="button" disabled={busy || !selected.size} onClick={() => void runBulkStatus('SHORTLISTED')} style={{ ...smallBtn, opacity: busy || !selected.size ? .5 : 1 }}>⭐ Shortlist</button>
        <button type="button" disabled={busy || !selected.size} onClick={() => void runBulkStatus('INTERVIEW_SCHEDULED')} style={{ ...smallBtn, opacity: busy || !selected.size ? .5 : 1 }}>📅 Move to interview</button>
        <button type="button" disabled={busy || !selected.size} onClick={() => void runBulkStatus('ON_HOLD')} style={{ ...smallBtn, opacity: busy || !selected.size ? .5 : 1 }}>⏸ Hold</button>
        <button type="button" disabled={busy || !selected.size} onClick={() => void runBulkStatus('REJECTED')} style={{ ...dangerBtn, padding: '6px 10px', fontSize: 11, borderRadius: 999, opacity: busy || !selected.size ? .5 : 1 }}>✕ Reject</button>
        <button type="button" disabled={busy || !selected.size} onClick={() => setNotifyOpen(true)} style={{ ...smallBtn, opacity: busy || !selected.size ? .5 : 1 }}>🔔 Notify</button>
        <button type="button" disabled={busy} onClick={() => void runExport()} style={{ ...smallBtn, opacity: busy ? .5 : 1 }}>⬇ Export CSV</button>
      </div>

      {/* Table */}
      {loading ? <SkeletonRows rows={6} /> : rows.length === 0 ? (
        <Empty icon="👥" title="No applicants yet" body="Once students apply to this drive they appear here with eligibility, ATS score and round tracking." />
      ) : (
        <div style={tblWrap}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={thStyle}><input type="checkbox" checked={allPageSelected} onChange={togglePage} /></th>
                <th style={thStyle}>Candidate</th><th style={thStyle}>College / Branch</th>
                <th style={thStyle}>Batch</th><th style={thStyle}>CGPA</th>
                <th style={thStyle}>Eligibility</th><th style={thStyle}>Status</th>
                <th style={thStyle}>ATS</th><th style={thStyle}>Round</th><th style={thStyle}>Offer</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = r.candidate.campusStudents?.[0];
                return (
                  <tr key={r.id} style={{ background: selected.has(r.id) ? 'rgba(167,139,250,0.06)' : undefined }}>
                    <td style={tdStyle}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td style={tdStyle}>
                      <strong style={{ color: C.text }}>{r.candidate.fullName ?? r.candidate.email}</strong>
                      <div style={{ color: C.faint, fontSize: 11 }}>{r.candidate.email}</div>
                    </td>
                    <td style={tdStyle}>{s?.college?.name ?? '—'}<div style={{ fontSize: 11, color: C.faint }}>{s?.branch?.name}</div></td>
                    <td style={tdStyle}>{s?.graduationYear ?? '—'}</td>
                    <td style={tdStyle}>{s?.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}</td>
                    <td style={tdStyle}>{r.campusDetail ? <EligibilityPill status={r.campusDetail.eligibilityStatus} /> : '—'}</td>
                    <td style={tdStyle}><StatusPill status={r.status} /></td>
                    <td style={tdStyle}>{r.atsScore != null ? `${Math.round(num(r.atsScore))}%` : '—'}</td>
                    <td style={tdStyle}>{r.campusDetail?.currentRoundKey ?? '—'}</td>
                    <td style={tdStyle}>{r.campusOffer ? <OfferPill status={r.campusOffer.status} /> : '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" style={smallBtn} onClick={() => setDetails(r)}>View</button>
                        <button type="button" style={smallBtn} onClick={() => { setSched({ roundType: 'technical', scheduledAt: '', durationMins: 45, mode: 'video' }); setScheduleFor(r); }}>Schedule</button>
                        <button type="button" style={smallBtn} onClick={() => { setOffer({ ctc: '', roleTitle: drive?.job?.title ?? '', location: drive?.location ?? '', joiningDate: '', expiresAt: '' }); setOfferFor(r); }}>Offer</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} loading={loading} />

      {/* Details modal */}
      <Modal open={!!details} onClose={() => setDetails(null)} title="Applicant details" width={640}>
        {details && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>{details.candidate.fullName ?? details.candidate.email}</strong>
              {details.campusDetail && <EligibilityPill status={details.campusDetail.eligibilityStatus} />}
              <StatusPill status={details.status} />
            </div>
            <div style={{ color: C.muted, fontSize: 13, display: 'grid', gap: 4 }}>
              <span>Email: {details.candidate.email}</span>
              <span>Applied: {fmtDate(details.appliedAt)}</span>
              {details.resume && <span>Resume: {details.resume.originalFileName} ({details.resume.analysisStatus})</span>}
            </div>
            {snap.reasons && snap.reasons.length > 0 && (
              <div style={{ border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.07)', borderRadius: 12, padding: 12 }}>
                <span style={labelStyle}>Ineligible because</span>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: C.muted, fontSize: 12.5, lineHeight: 1.7 }}>
                  {snap.reasons.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {details.campusDetail?.missingFields?.length ? (
              <div style={{ border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', borderRadius: 12, padding: 12, color: C.yellow, fontSize: 12.5 }}>
                Missing academic data: {details.campusDetail.missingFields.join(', ')}
              </div>
            ) : null}
            {snap.checks && snap.checks.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={labelStyle}>Rule breakdown</span>
                {snap.checks.filter((c) => c.state !== 'skipped').map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: c.state === 'pass' ? C.green : c.state === 'fail' ? C.red : C.yellow }}>
                    <span>{c.state === 'pass' ? '✓' : c.state === 'fail' ? '✕' : '?'}</span><span style={{ color: C.muted }}>{c.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Schedule modal */}
      <Modal open={!!scheduleFor} onClose={() => setScheduleFor(null)} title={`Schedule interview · ${scheduleFor?.candidate.fullName ?? ''}`}
        footer={<>
          <button type="button" style={secondaryBtn} onClick={() => setScheduleFor(null)}>Cancel</button>
          <button type="button" style={primaryBtn} disabled={busy} onClick={() => void submitSchedule()}>{busy ? 'Scheduling…' : 'Schedule + notify'}</button>
        </>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Round type">
            <select value={sched.roundType} onChange={(e) => setSched({ ...sched, roundType: e.target.value })} style={inputStyle}>
              <option value="technical">Technical</option><option value="hr">HR</option>
              <option value="managerial">Managerial</option><option value="assignment">Assignment</option>
            </select>
          </Field>
          <Field label="Date & time"><input type="datetime-local" value={sched.scheduledAt} onChange={(e) => setSched({ ...sched, scheduledAt: e.target.value })} style={inputStyle} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Duration (min)"><input type="number" min={15} value={sched.durationMins} onChange={(e) => setSched({ ...sched, durationMins: num(e.target.value) })} style={inputStyle} /></Field>
            <Field label="Mode">
              <select value={sched.mode} onChange={(e) => setSched({ ...sched, mode: e.target.value })} style={inputStyle}>
                <option value="video">Video</option><option value="phone">Phone</option><option value="offline">Offline</option>
              </select>
            </Field>
          </div>
        </div>
      </Modal>

      {/* Offer modal */}
      <Modal open={!!offerFor} onClose={() => setOfferFor(null)} title={`Release offer · ${offerFor?.candidate.fullName ?? ''}`}
        footer={<>
          <button type="button" style={secondaryBtn} onClick={() => setOfferFor(null)}>Cancel</button>
          <button type="button" style={primaryBtn} disabled={busy} onClick={() => void submitOffer()}>{busy ? 'Releasing…' : 'Release offer'}</button>
        </>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="CTC (annual)"><input type="number" value={offer.ctc} onChange={(e) => setOffer({ ...offer, ctc: e.target.value })} placeholder="1200000" style={inputStyle} /></Field>
            <Field label="Role title"><input value={offer.roleTitle} onChange={(e) => setOffer({ ...offer, roleTitle: e.target.value })} style={inputStyle} /></Field>
          </div>
          <Field label="Location"><input value={offer.location} onChange={(e) => setOffer({ ...offer, location: e.target.value })} style={inputStyle} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Joining date"><input type="date" value={offer.joiningDate} onChange={(e) => setOffer({ ...offer, joiningDate: e.target.value })} style={inputStyle} /></Field>
            <Field label="Offer expires"><input type="date" value={offer.expiresAt} onChange={(e) => setOffer({ ...offer, expiresAt: e.target.value })} style={inputStyle} /></Field>
          </div>
        </div>
      </Modal>

      {/* Notify modal */}
      <Modal open={notifyOpen} onClose={() => setNotifyOpen(false)} title={`Notify ${selected.size} applicants`}
        footer={<>
          <button type="button" style={secondaryBtn} onClick={() => setNotifyOpen(false)}>Cancel</button>
          <button type="button" style={primaryBtn} disabled={busy} onClick={() => void runNotify()}>{busy ? 'Sending…' : 'Queue notifications'}</button>
        </>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Title"><input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} style={inputStyle} /></Field>
          <Field label="Message"><textarea rows={4} value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        </div>
      </Modal>
    </div>
  );
}