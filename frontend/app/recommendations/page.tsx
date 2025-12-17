export default function RecommendationsPage() {
  const recs = [
    { role: 'Backend Engineer', match: 92, reason: 'Strong Node + DB experience' },
    { role: 'Fullstack Engineer', match: 88, reason: 'React + Node + Cloud exposure' },
    { role: 'Data Engineer', match: 74, reason: 'ETL + SQL projects, add Spark' },
  ];
  return (
    <section>
      <div className="section-header">
        <h1 className="text-3xl font-bold">Recommendations</h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recs.map((r) => (
          <div key={r.role} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.role}</div>
              <div className="px-2 py-1 rounded badge-neon text-xs font-medium">{r.match}%</div>
            </div>
            <p className="mt-2 text-[var(--text-muted)] text-sm">{r.reason}</p>
            <div className="mt-4 flex gap-3">
              <a className="btn btn-secondary" href="#">View details</a>
              <a className="btn" href="#">Apply</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}