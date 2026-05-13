'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import {
  RecruiterProfile,
  RecruiterProfileUpdateDto,
} from '@/lib/api/profiles';
import {
  useRecruiterProfile,
  useUpdateRecruiterProfile,
} from '@/hooks/userProfile';
import { useAuth } from '@/components/providers/AuthProvider';

const C = {
  bg: '#050816',
  card: 'rgba(15,23,42,0.78)',
  card2: 'rgba(2,6,23,0.88)',
  border: 'rgba(148,163,184,0.18)',
  borderStrong: 'rgba(56,189,248,0.38)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  faint: '#64748B',
  sky: '#38BDF8',
  purple: '#A78BFA',
  pink: '#F472B6',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#F87171',
};

type RecruiterFormState = {
  title: string;
  photoUrl: string;
  phone: string;
  linkedinUrl: string;
  companyName: string;
  companySize: string;
  companyIndustry: string;
  companyWebsite: string;
  companyLogoUrl: string;
  companyDescription: string;
  companyLocation: string;
  hiringRoles: string;
  typicalStack: string;
  hiringVolume: string;
  openToRemote: boolean;
};

const EMPTY_FORM: RecruiterFormState = {
  title: '',
  photoUrl: '',
  phone: '',
  linkedinUrl: '',
  companyName: '',
  companySize: '',
  companyIndustry: '',
  companyWebsite: '',
  companyLogoUrl: '',
  companyDescription: '',
  companyLocation: '',
  hiringRoles: '',
  typicalStack: '',
  hiringVolume: '',
  openToRemote: true,
};

const COMPANY_SIZE_OPTIONS = ['', '1-10', '11-50', '51-200', '201-500', '500+'];
const HIRING_VOLUME_OPTIONS = ['', '1-5', '5-20', '20+'];

function arrayToText(value?: string[] | null): string {
  return Array.isArray(value) ? value.join(', ') : '';
}

function textToArray(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function profileToForm(profile?: RecruiterProfile | null): RecruiterFormState {
  if (!profile) return EMPTY_FORM;

  return {
    title: profile.title ?? '',
    photoUrl: profile.photoUrl ?? '',
    phone: profile.phone ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    companyName: profile.companyName ?? '',
    companySize: profile.companySize ?? '',
    companyIndustry: arrayToText(profile.companyIndustry),
    companyWebsite: profile.companyWebsite ?? '',
    companyLogoUrl: profile.companyLogoUrl ?? '',
    companyDescription: profile.companyDescription ?? '',
    companyLocation: profile.companyLocation ?? '',
    hiringRoles: arrayToText(profile.hiringRoles),
    typicalStack: arrayToText(profile.typicalStack),
    hiringVolume: profile.hiringVolume ?? '',
    openToRemote: Boolean(profile.openToRemote),
  };
}

function formToDto(form: RecruiterFormState): RecruiterProfileUpdateDto {
  return {
    title: form.title.trim() || undefined,
    photoUrl: form.photoUrl.trim() || undefined,
    phone: form.phone.trim() || undefined,
    linkedinUrl: form.linkedinUrl.trim() || undefined,
    companyName: form.companyName.trim() || undefined,
    companySize: form.companySize || undefined,
    companyIndustry: textToArray(form.companyIndustry),
    companyWebsite: form.companyWebsite.trim() || undefined,
    companyLogoUrl: form.companyLogoUrl.trim() || undefined,
    companyDescription: form.companyDescription.trim() || undefined,
    companyLocation: form.companyLocation.trim() || undefined,
    hiringRoles: textToArray(form.hiringRoles),
    typicalStack: textToArray(form.typicalStack),
    hiringVolume: form.hiringVolume || undefined,
    openToRemote: form.openToRemote,
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option || 'empty'} value={option}>
            {option || 'Select'}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          resize: 'vertical',
          minHeight: rows * 34,
          lineHeight: 1.6,
        }}
      />
    </label>
  );
}

function StatCard({
  label,
  value,
  accent = C.sky,
  suffix,
}: {
  label: string;
  value: number | string;
  accent?: string;
  suffix?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        background:
          'linear-gradient(145deg, rgba(15,23,42,0.88), rgba(2,6,23,0.76))',
        borderRadius: 18,
        padding: '1rem',
        minHeight: 92,
      }}
    >
      <div
        style={{
          color: C.muted,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: accent,
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: '-0.04em',
        }}
      >
        {value}
        {suffix ? (
          <span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TagList({
  items,
  empty,
  accent = C.sky,
}: {
  items?: string[] | null;
  empty: string;
  accent?: string;
}) {
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return <p style={{ color: C.faint, fontSize: 13, margin: 0 }}>{empty}</p>;
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {list.map((item) => (
        <span
          key={item}
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            border: `1px solid ${accent}44`,
            background: `${accent}12`,
            color: '#E0F2FE',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            height: 220,
            borderRadius: 28,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${C.border}`,
            marginBottom: 20,
          }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
          }}
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                height: 94,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function RecruiterProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useRecruiterProfile();
  const updateProfile = useUpdateRecruiterProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RecruiterFormState>(EMPTY_FORM);

  useEffect(() => {
    if (profile) {
      setForm(profileToForm(profile));
    }
  }, [profile]);

  const pipeline = profile?.pipeline;

  const completion = useMemo(() => {
    return Math.max(0, Math.min(100, safeNumber(profile?.profileCompletion)));
  }, [profile?.profileCompletion]);

  const companyInitial = useMemo(() => {
    const source = profile?.companyName || user?.full_name || user?.email || 'R';
    return source.trim().charAt(0).toUpperCase();
  }, [profile?.companyName, user?.email, user?.full_name]);

  const set = <K extends keyof RecruiterFormState>(
    key: K,
    value: RecruiterFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    const dto = formToDto(form);
    await updateProfile.mutateAsync(dto);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm(profileToForm(profile));
    setEditing(false);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            border: `1px solid ${C.red}55`,
            background: 'rgba(127,29,29,0.18)',
            borderRadius: 20,
            padding: '1.5rem',
            color: C.text,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22 }}>Recruiter profile failed</h2>
          <p style={{ color: C.muted }}>
            Unable to load recruiter profile. Check backend `/recruiters/profile`.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            style={primaryButtonStyle}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 30,
            border: `1px solid ${C.borderStrong}`,
            background:
              'radial-gradient(circle at 10% 10%, rgba(56,189,248,0.20), transparent 30%), radial-gradient(circle at 90% 20%, rgba(244,114,182,0.18), transparent 28%), linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.94))',
            padding: '2rem',
            boxShadow: '0 28px 90px rgba(0,0,0,0.45)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: '1.25rem',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 24,
                border: `1px solid ${C.borderStrong}`,
                background: profile?.companyLogoUrl
                  ? `url(${profile.companyLogoUrl}) center/cover`
                  : 'linear-gradient(135deg, rgba(56,189,248,0.35), rgba(167,139,250,0.30))',
                display: 'grid',
                placeItems: 'center',
                color: C.text,
                fontSize: 38,
                fontWeight: 900,
              }}
            >
              {!profile?.companyLogoUrl ? companyInitial : null}
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 8,
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    color: C.text,
                    fontSize: 34,
                    lineHeight: 1.05,
                    letterSpacing: '-0.05em',
                  }}
                >
                  {profile?.companyName || 'Company profile'}
                </h1>

                {profile?.isVerified ? (
                  <span
                    style={{
                      borderRadius: 999,
                      background: 'rgba(52,211,153,0.14)',
                      border: '1px solid rgba(52,211,153,0.35)',
                      color: C.green,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Verified
                  </span>
                ) : (
                  <span
                    style={{
                      borderRadius: 999,
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.35)',
                      color: C.amber,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Verification pending
                  </span>
                )}
              </div>

              <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
                {profile?.title || 'Recruiter'} ·{' '}
                {profile?.companyLocation || 'Location not added'} ·{' '}
                {profile?.openToRemote ? 'Remote hiring enabled' : 'On-site focused'}
              </p>

              <p
                style={{
                  margin: '0.85rem 0 0',
                  maxWidth: 780,
                  color: '#CBD5E1',
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {profile?.companyDescription ||
                  'Add company description, hiring focus, stack, and open roles to make your recruiter profile stronger.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  style={primaryButtonStyle}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                    style={primaryButtonStyle}
                  >
                    {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={updateProfile.isPending}
                    style={secondaryButtonStyle}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 220px',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: 'rgba(148,163,184,0.18)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${completion}%`,
                    height: '100%',
                    borderRadius: 999,
                    background:
                      completion >= 75
                        ? `linear-gradient(90deg, ${C.green}, ${C.sky})`
                        : `linear-gradient(90deg, ${C.amber}, ${C.pink})`,
                  }}
                />
              </div>
              <p style={{ margin: '0.5rem 0 0', color: C.muted, fontSize: 12 }}>
                Profile completion: {completion}%
              </p>
            </div>

            <div
              style={{
                color: C.muted,
                fontSize: 12,
                textAlign: 'right',
              }}
            >
              Subscription:{' '}
              <strong style={{ color: C.text }}>
                {profile?.subscriptionTier || 'free'}
              </strong>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginTop: 18,
          }}
        >
          <StatCard
            label="Active Jobs"
            value={safeNumber(pipeline?.activeJobs)}
            accent={C.green}
          />
          <StatCard
            label="Applications"
            value={safeNumber(pipeline?.totalApplications)}
            accent={C.sky}
          />
          <StatCard
            label="Shortlisted"
            value={safeNumber(pipeline?.shortlisted)}
            accent={C.purple}
          />
          <StatCard
            label="Offer Rate"
            value={safeNumber(pipeline?.offerRate)}
            suffix="%"
            accent={C.pink}
          />
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: editing ? '1.1fr 0.9fr' : '0.9fr 1.1fr',
            gap: 18,
            marginTop: 18,
            alignItems: 'start',
          }}
        >
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Company Profile</h2>
                <p style={sectionSubStyle}>
                  Public recruiter/company information shown to candidates.
                </p>
              </div>
            </div>

            {editing ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <Field
                  label="Recruiter title"
                  value={form.title}
                  onChange={(value) => set('title', value)}
                  placeholder="Talent Acquisition Lead"
                />

                <Field
                  label="Company name"
                  value={form.companyName}
                  onChange={(value) => set('companyName', value)}
                  placeholder="Aryvion Technologies"
                />

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <SelectField
                    label="Company size"
                    value={form.companySize}
                    options={COMPANY_SIZE_OPTIONS}
                    onChange={(value) => set('companySize', value)}
                  />
                  <SelectField
                    label="Hiring volume"
                    value={form.hiringVolume}
                    options={HIRING_VOLUME_OPTIONS}
                    onChange={(value) => set('hiringVolume', value)}
                  />
                </div>

                <Field
                  label="Company location"
                  value={form.companyLocation}
                  onChange={(value) => set('companyLocation', value)}
                  placeholder="Pune, Maharashtra"
                />

                <Field
                  label="Company website"
                  value={form.companyWebsite}
                  onChange={(value) => set('companyWebsite', value)}
                  placeholder="https://company.com"
                />

                <Field
                  label="Company logo URL"
                  value={form.companyLogoUrl}
                  onChange={(value) => set('companyLogoUrl', value)}
                  placeholder="https://..."
                />

                <TextAreaField
                  label="Company description"
                  value={form.companyDescription}
                  onChange={(value) => set('companyDescription', value)}
                  placeholder="Describe company mission, culture, hiring focus..."
                  rows={5}
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: C.text,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.openToRemote}
                    onChange={(event) => set('openToRemote', event.target.checked)}
                  />
                  Open to remote candidates
                </label>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <InfoRow label="Recruiter Title" value={profile?.title} />
                <InfoRow label="Company Size" value={profile?.companySize} />
                <InfoRow label="Location" value={profile?.companyLocation} />
                <InfoRow label="Website" value={profile?.companyWebsite} link />
                <InfoRow
                  label="Remote Hiring"
                  value={profile?.openToRemote ? 'Yes' : 'No'}
                />
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Hiring Focus</h2>
                <p style={sectionSubStyle}>
                  Roles, industries, and tech stack your company usually hires for.
                </p>
              </div>
            </div>

            {editing ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <TextAreaField
                  label="Company industries"
                  value={form.companyIndustry}
                  onChange={(value) => set('companyIndustry', value)}
                  placeholder="AI, SaaS, FinTech, Industrial Automation"
                  rows={3}
                />

                <TextAreaField
                  label="Hiring roles"
                  value={form.hiringRoles}
                  onChange={(value) => set('hiringRoles', value)}
                  placeholder="Frontend Developer, Backend Developer, AI Engineer"
                  rows={3}
                />

                <TextAreaField
                  label="Typical stack"
                  value={form.typicalStack}
                  onChange={(value) => set('typicalStack', value)}
                  placeholder="React, Next.js, Node.js, NestJS, PostgreSQL"
                  rows={3}
                />

                <Field
                  label="LinkedIn URL"
                  value={form.linkedinUrl}
                  onChange={(value) => set('linkedinUrl', value)}
                  placeholder="https://linkedin.com/in/..."
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => set('phone', value)}
                  placeholder="+91..."
                />

                <Field
                  label="Profile photo URL"
                  value={form.photoUrl}
                  onChange={(value) => set('photoUrl', value)}
                  placeholder="https://..."
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <h3 style={miniTitleStyle}>Industries</h3>
                  <TagList
                    items={profile?.companyIndustry}
                    empty="No industries added"
                    accent={C.sky}
                  />
                </div>

                <div>
                  <h3 style={miniTitleStyle}>Hiring Roles</h3>
                  <TagList
                    items={profile?.hiringRoles}
                    empty="No hiring roles added"
                    accent={C.purple}
                  />
                </div>

                <div>
                  <h3 style={miniTitleStyle}>Typical Stack</h3>
                  <TagList
                    items={profile?.typicalStack}
                    empty="No stack added"
                    accent={C.pink}
                  />
                </div>

                <InfoRow label="LinkedIn" value={profile?.linkedinUrl} link />
                <InfoRow label="Phone" value={profile?.phone} />
              </div>
            )}
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 18,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Hiring Pipeline</h2>
              <p style={sectionSubStyle}>
                Live recruiter pipeline data from jobs and applications.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              label="Total Jobs"
              value={safeNumber(pipeline?.totalJobs)}
              accent={C.sky}
            />
            <StatCard
              label="New Applicants"
              value={safeNumber(pipeline?.newApplicants)}
              accent={C.amber}
            />
            <StatCard
              label="In Interview"
              value={safeNumber(pipeline?.inInterview)}
              accent={C.purple}
            />
            <StatCard
              label="Offered"
              value={safeNumber(pipeline?.offered)}
              accent={C.green}
            />
            <StatCard
              label="Avg Days To Hire"
              value={safeNumber(pipeline?.avgDaysToHire)}
              accent={C.pink}
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <h3 style={miniTitleStyle}>Recent Applicants</h3>

            {profile?.recentApplicants?.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {profile.recentApplicants.slice(0, 6).map((applicant: any) => (
                  <div
                    key={applicant.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.1fr 1fr auto',
                      gap: 12,
                      alignItems: 'center',
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: '0.9rem 1rem',
                      background: 'rgba(15,23,42,0.55)',
                    }}
                  >
                    <div>
                      <div style={{ color: C.text, fontWeight: 800 }}>
                        {applicant.candidateName ||
                          applicant.candidate_name ||
                          'Candidate'}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {applicant.candidateEmail ||
                          applicant.candidate_email ||
                          'No email'}
                      </div>
                    </div>

                    <div style={{ color: C.muted, fontSize: 13 }}>
                      {applicant.jobTitle || applicant.job_title || 'Job'}
                    </div>

                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: `1px solid ${C.border}`,
                        color: C.sky,
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: 'capitalize',
                      }}
                    >
                      {String(applicant.status ?? 'applied').replaceAll('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: C.faint, margin: 0 }}>
                No recent applicants yet. Once jobs receive applications, they
                will appear here.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  link = false,
}: {
  label: string;
  value?: string | null;
  link?: boolean;
}) {
  const clean = value?.trim();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <div style={{ color: C.faint, fontSize: 12, fontWeight: 800 }}>
        {label}
      </div>

      {clean ? (
        link ? (
          <a
            href={clean}
            target="_blank"
            rel="noreferrer"
            style={{
              color: C.sky,
              fontSize: 14,
              textDecoration: 'none',
              wordBreak: 'break-word',
            }}
          >
            {clean}
          </a>
        ) : (
          <div
            style={{
              color: C.text,
              fontSize: 14,
              wordBreak: 'break-word',
            }}
          >
            {clean}
          </div>
        )
      ) : (
        <div style={{ color: C.faint, fontSize: 14 }}>Not added</div>
      )}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top left, rgba(56,189,248,0.10), transparent 34%), radial-gradient(circle at top right, rgba(244,114,182,0.10), transparent 30%), #050816',
  padding: '2rem',
  color: C.text,
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.82), rgba(2,6,23,0.86))',
  borderRadius: 22,
  padding: '1.35rem',
  boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: C.text,
  fontSize: 20,
  letterSpacing: '-0.03em',
};

const sectionSubStyle: React.CSSProperties = {
  margin: '0.35rem 0 0',
  color: C.muted,
  fontSize: 13,
  lineHeight: 1.6,
};

const miniTitleStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  color: C.text,
  fontSize: 14,
  fontWeight: 900,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: C.muted,
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
  background: 'rgba(2,6,23,0.72)',
  color: C.text,
  borderRadius: 13,
  padding: '12px 13px',
  outline: 'none',
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 14,
  padding: '12px 16px',
  color: '#020617',
  fontWeight: 900,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  boxShadow: '0 16px 38px rgba(56,189,248,0.18)',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '11px 16px',
  color: C.text,
  fontWeight: 800,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
};