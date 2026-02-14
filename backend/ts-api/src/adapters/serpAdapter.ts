import SerpApi from "google-search-results-nodejs";
import { ENV } from "../config/env";
import { NormalizedJob } from "../types/job";

const search = new SerpApi.GoogleSearch(ENV.SERP_API_KEY);

export async function fetchFromSerp(
  query: string,
  location?: string
): Promise<NormalizedJob[]> {
  const params = {
    engine: "google_jobs",
    q: query,
    location: location || "India",
    hl: "en",
  };

  const data = await new Promise<any>((resolve, reject) => {
    search.json(params, (result: any) => {
      if (!result) reject(new Error("No data from SerpAPI"));
      resolve(result);
    });
  });

  const jobs = data.jobs_results || [];

  return jobs.map((job: any) => ({
    externalId: job.job_id,
    source: "serpapi",
    title: job.title,
    company: job.company_name,
    location: job.location,
    description: job.description,
    postingUrl: job.related_links?.[0]?.link || null,
    postedAt: null,
    rawPayload: job,
  }));
}
