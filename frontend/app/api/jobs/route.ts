/* eslint-disable @typescript-eslint/no-explicit-any */
import SerpApi from "google-search-results-nodejs";
import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { NextResponse } from "next/server";

const serpApiKey = process.env.SERP_API_KEY;
if (!serpApiKey) {
  throw new Error("SERP_API_KEY environment variable is not set");
}
const search = new SerpApi.GoogleSearch(serpApiKey);

export async function POST(req: NextRequest) {
  try {
    const { skills = [], titles = [], location = "" } = await req.json();

    const queryParts: string[] = [];
    if (titles?.length) queryParts.push(titles.slice(0, 3).join(" OR "));
    if (skills?.length) queryParts.push(skills.slice(0, 5).join(" "));

    const query = queryParts.join(" ") || "software engineer";

    const params = {
      engine: "google_jobs",
      q: query,
      location: location || "India",
      hl: "en",
      api_key: process.env.SERP_API_KEY,
    };

    const results = await new Promise<any>((resolve, reject) => {
      search.json(params, (data: any) => {
        if (!data) reject("No data");
        resolve(data);
      });
    });

    const jobs = (results.jobs_results || []).map((job: any) => ({
      id: job.job_id,
      title: job.title,
      company: job.company_name,
      location: job.location,
      description: job.description,
      url: job.related_links?.[0]?.link,
      source: "SerpAPI",
    }));

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "SerpAPI fetch failed" },
      { status: 500 }
    );
  }
}
