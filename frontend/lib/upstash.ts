// frontend/lib/upstash.ts
const UPSTASH_URL = process.env.NEXT_PUBLIC_UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.NEXT_PUBLIC_UPSTASH_REST_TOKEN;

export async function getQueueLength(queue: string, status: 'wait' | 'active' | 'failed') {
  const key = `bull:${queue}:${status}`;
  
  if (status === 'failed') {
    const res = await fetch(`${UPSTASH_URL}/zcard/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    return data.result || 0;
  }
  
  const res = await fetch(`${UPSTASH_URL}/llen/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const data = await res.json();
  return data.result || 0;
}

export async function getQueueMetrics() {
  const [waiting, active, failed] = await Promise.all([
    getQueueLength('ats-queue', 'wait'),
    getQueueLength('ats-queue', 'active'),
    getQueueLength('ats-queue', 'failed'),
  ]);

  return {
    queue: 'ats-queue',
    waiting,
    active,
    failed,
    timestamp: new Date().toISOString(),
  };
}