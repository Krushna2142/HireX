/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/features/resume/hooks/useHistory.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';

export type AnalysisItem = {
  id: number;
  userId: string;
  fileName: string;
  result: any; // full analysis JSON
  createdAt: string;
};

export function useHistory(userId?: string, limit: number = 50) {
  return useQuery({
    queryKey: ['analysis-history', userId, limit],
    queryFn: () => apiGet<{ items: AnalysisItem[] }>('/api/analyze/history', { userId, limit }),
    select: (res) => res.items,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });
}