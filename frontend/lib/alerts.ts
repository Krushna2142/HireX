// frontend/lib/alerts.ts
import api from '@/lib/axios';

export interface Alert {
  id:        string;
  type:      string;
  message:   string;
  read:      boolean;
  createdAt: string;
}

export async function getAlerts(): Promise<{ alerts: Alert[]; unread: number }> {
  try {
    const { data } = await api.get<{ alerts: Alert[]; unread: number }>('/alerts');
    return data;
  } catch {
    return { alerts: [], unread: 0 };
  }
}