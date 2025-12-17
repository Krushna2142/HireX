/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string | null;
  url: string;
  source: string;
  postedAt?: string | null;
  descriptionSnippet?: string | null;
};

function uniq<T>(arr: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function POST(req: NextRequest) {
  try {
    const { skills = [], titles = [], location = '' } = await req.json();

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY missing' }, { status: 500 });
    }

    // Build a concise query
    const qParts: string[] = [];
    if (titles?.length) qParts.push(titles.slice(0, 3).join(' OR '));
    if (skills?.length) qParts.push(skills.slice(0, 5).join(' '));
    const query = qParts.join(' ');

    const params = new URLSearchParams({
      query: query || 'software engineer',
      page: '1',
      num_pages: '1',
      date_posted: 'month',
      remote_jobs_only: 'false',
    });
    if (location) params.set('location', location);

    const jsearchRes = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      cache: 'no-store',
    });

    if (!jsearchRes.ok) {
      const t = await jsearchRes.text();
      return NextResponse.json({ error: `JSearch failed: ${t}` }, { status: 502 });
    }

    const jjson = await jsearchRes.json();
    const jobs: Job[] = (jjson?.data ?? []).map((j: any): Job => ({
      id: String(j.job_id ?? j.job_posted_at_timestamp ?? Math.random()),
      title: String(j.job_title ?? ''),
      company: String(j.employer_name ?? ''),
      location: String(j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country ?? ''),
      salary: j.job_min_salary && j.job_max_salary ? `$${j.job_min_salary} - $${j.job_max_salary}` : null,
      url: String(j.job_apply_link ?? j.job_google_link ?? j.job_offer_expiration_datetime_utc ?? '#'),
      source: 'JSearch',
      postedAt: j.job_posted_at_datetime_utc ?? null,
      descriptionSnippet: j.job_description?.slice(0, 240) ?? null,
    }));

    const deduped = uniq(jobs, (x) => x.url || x.id);
    return NextResponse.json({ jobs: deduped, count: deduped.length, query });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Jobs fetch failed' }, { status: 500 });
  }
}