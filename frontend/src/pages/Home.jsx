import React from "react";
import { Link } from "react-router-dom";

function Stat({ title, value }) {
  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-teal-600">{value}</h3>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            AI ResumePro — Smart resumes, smarter matches
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Upload your resume, get an ATS score, personalised job recommendations,
            mock interviews and targeted learning resources — all powered by AI.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/resume-upload"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-teal-600 text-white font-medium shadow hover:bg-teal-700"
            >
              Analyze Resume
            </Link>
            <Link
              to="/job-recommendations"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Explore Jobs
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat title="Resumes analyzed" value="1.8k+" />
            <Stat title="Avg. interview score" value="78%" />
            <Stat title="Resources recommended" value="4.2k+" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-lg">
            <div className="text-center text-slate-400">
              <div className="text-gray-500">
                AI-powered dashboard preview coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
