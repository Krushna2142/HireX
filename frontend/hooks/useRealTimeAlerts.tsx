/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  subscribeToAlerts,
  subscribeToApplications,
  unsubscribe,
} from '@/lib/supabase/realtime';
import toast from 'react-hot-toast';

// ── Alert type → emoji prefix map ─────────────────────────────────────────────
const ALERT_ICONS: Record<string, string> = {
  job_match:          '🎯',
  application_update: '📋',
  new_applicant:      '👤',
  interview:          '📅',
  profile_view:       '👁',
};

export function useRealTimeAlerts() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const handleNewAlert = useCallback(
    (payload: any) => {
      const alert = payload?.new;
      if (!alert) return;

      const icon    = ALERT_ICONS[alert.type as string] ?? '🔔';
      const title   = (alert.title   as string) ?? 'New notification';
      const message = (alert.message as string) ?? '';

      // Plain string toast — no JSX, works in .ts files
      toast(`${icon} ${title}\n${message}`, {
        duration: 5000,
        position: 'top-right',
        style: {
          background:   '#111827',
          color:        '#F1F5F9',
          border:       '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          fontSize:     '13px',
          maxWidth:     '360px',
          padding:      '14px 16px',
        },
      });

      // Invalidate queries so UI reflects new alert immediately
      queryClient.invalidateQueries({ queryKey: ['alerts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['alerts-count', user?.id] });
    },
    [queryClient, user?.id],
  );

  useEffect(() => {
    if (!user?.id) return;

    const alertChannel = subscribeToAlerts(user.id, handleNewAlert);

    const appChannel = subscribeToApplications(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ['applications', user.id] });
    });

    return () => {
      unsubscribe(alertChannel);
      unsubscribe(appChannel);
    };
  }, [user?.id, handleNewAlert, queryClient]);
}