// frontend/components/admin/QueueMonitor.tsx
'use client';

import { useEffect, useState } from 'react';
import { queueApi, type QueueMetrics } from '@/lib/axios';

export default function QueueMonitor() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data } = await queueApi.getMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch queue metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = autoRefresh ? setInterval(fetchMetrics, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  if (loading && !metrics) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const total = metrics.waiting + metrics.active + metrics.delayed + metrics.failed;
  const healthStatus = total === 0 ? 'healthy' : total < 10 ? 'normal' : 'busy';
  const healthColor = {
    healthy: 'text-green-400',
    normal: 'text-blue-400',
    busy: 'text-yellow-400',
  }[healthStatus];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">ATS Queue Monitor</h2>
          <p className="text-sm text-white/60 mt-1">
            Real-time BullMQ queue status • {metrics.queue}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${healthColor}`}>
            <div className={`w-2 h-2 rounded-full bg-current animate-pulse`} />
            <span className="text-sm font-semibold capitalize">{healthStatus}</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="Waiting"
          value={metrics.waiting}
          color="blue"
          icon="⏳"
        />
        <MetricCard
          label="Active"
          value={metrics.active}
          color="green"
          icon="▶️"
        />
        <MetricCard
          label="Delayed"
          value={metrics.delayed}
          color="yellow"
          icon="⏰"
        />
        <MetricCard
          label="Failed"
          value={metrics.failed}
          color="red"
          icon="❌"
        />
        <MetricCard
          label="Completed"
          value={metrics.completed}
          color="purple"
          icon="✅"
        />
      </div>

      {metrics.failed > 0 && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">
            ⚠️ {metrics.failed} job{metrics.failed > 1 ? 's' : ''} failed. Check logs for details.
          </p>
        </div>
      )}

      <div className="mt-6 text-xs text-white/40">
        Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  icon: string;
}) {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
  };

  const textColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`rounded-lg border ${colors[color]} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-bold ${textColors[color]}`}>
          {value}
        </span>
      </div>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}