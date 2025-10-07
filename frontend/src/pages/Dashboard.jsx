import React, { useEffect, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from "chart.js";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Dashboard() {
  const { user } = useAuth();
  const [resumeStats, setResumeStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await api.get("/dashboard/stats");
        setResumeStats(statsRes.data);
        const jobsRes = await api.get("/dashboard/recent-jobs");
        setRecentJobs(jobsRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const pieData = {
    labels: ["Matched Skills", "Missing Skills"],
    datasets: [
      {
        data: resumeStats ? [resumeStats.matchedSkills, resumeStats.missingSkills] : [0,0],
        backgroundColor: ["#14B8A6", "#F87171"],
        borderWidth: 1,
      },
    ],
  };

  const barData = {
    labels: resumeStats ? resumeStats.topSkills.map(s => s.name) : [],
    datasets: [{ label: "Skill Score", data: resumeStats ? resumeStats.topSkills.map(s => s.score) : [], backgroundColor: "#3B82F6" }],
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.displayName || "User"}</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Resumes Analyzed" value={resumeStats?.totalResumes || 0} />
        <Card title="Avg Interview Score" value={`${resumeStats?.avgInterviewScore || 0}%`} />
        <Card title="Jobs Recommended" value={resumeStats?.totalJobs || 0} />
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold text-lg mb-3">Resume Skill Match</h2>
          <Pie data={pieData} />
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold text-lg mb-3">Top Skills</h2>
          <Bar data={barData} options={{ responsive:true, plugins:{legend:{display:false}}}} />
        </div>
      </div>
      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold text-lg mb-4">Recent Job Recommendations</h2>
        <div className="space-y-3">
          {recentJobs.length===0 ? <p className="text-gray-500">No recent jobs yet.</p> :
            recentJobs.map(job=>(
              <div key={job.id} className="border rounded p-3 flex justify-between items-center hover:shadow">
                <div>
                  <h3 className="font-medium">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.company}</p>
                </div>
                <span className="text-sm text-gray-400">{job.postedAt}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white shadow rounded p-6 text-center hover:shadow-lg transition">
      <h3 className="text-gray-500">{title}</h3>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
