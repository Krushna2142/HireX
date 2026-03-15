// frontend/lib/api/alerts.ts
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Alert {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function getAlerts(): Promise<{ alerts: Alert[]; unread: number }> {
  const token = getToken();
  if (!token) return { alerts: [], unread: 0 };

  const res = await fetch(`${API_URL}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { alerts: [], unread: 0 };
  return res.json();
}