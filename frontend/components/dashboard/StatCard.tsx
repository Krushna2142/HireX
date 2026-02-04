export default function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[var(--text-muted)] text-xs">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}