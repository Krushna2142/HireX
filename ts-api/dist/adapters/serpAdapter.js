"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromSerp = fetchFromSerp;
const google_search_results_nodejs_1 = __importDefault(require("google-search-results-nodejs"));
const env_1 = require("../config/env");
const search = new google_search_results_nodejs_1.default.GoogleSearch(env_1.ENV.SERP_API_KEY);
async function fetchFromSerp(query, location) {
    const params = {
        engine: "google_jobs",
        q: query,
        location: location || "India",
        hl: "en",
    };
    const data = await new Promise((resolve, reject) => {
        search.json(params, (result) => {
            if (!result)
                reject(new Error("No data from SerpAPI"));
            resolve(result);
        });
    });
    const jobs = data.jobs_results || [];
    return jobs.map((job) => ({
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
//# sourceMappingURL=serpAdapter.js.map