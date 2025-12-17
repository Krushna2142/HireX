export default function JobsPage() {
  const jobs = [
    { title: 'Senior Backend Engineer', company: 'Acme', location: 'Remote', salary: '$160k' },
    { title: 'Fullstack Developer', company: 'Globex', location: 'NYC', salary: '$140k' },
    { title: 'Data Engineer', company: 'Initech', location: 'SF', salary: '$150k' },
  ];
  return (
    <section>
      <div className="section-header">
        <h1 className="text-3xl font-bold">Jobs</h1>
      </div>
      <div className="panel p-4 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <input placeholder="Search roles…" className="px-3 py-2" />
          <select className="px-3 py-2">
            <option>All locations</option>
            <option>Remote</option>
            <option>NYC</option>
            <option>SF</option>
          </select>
          <button className="btn w-full sm:w-auto">Filter</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((j) => (
          <div key={j.title} className="card p-5">
            <div className="font-semibold">{j.title}</div>
            <div className="text-sm text-[var(--text-muted)]">{j.company} • {j.location}</div>
            <div className="mt-2 text-sm">{j.salary}</div>
            <div className="mt-4 flex gap-3">
              <a className="btn btn-secondary" href="#">Details</a>
              <a className="btn" href="#">Apply</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}