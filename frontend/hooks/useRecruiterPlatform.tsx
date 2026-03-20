/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  subscribeToAlerts,
  subscribeToJobApplicants,
  unsubscribe,
} from '@/lib/supabase/realtime';
import toast from 'react-hot-toast';

export function useRecruiterRealtime(jobIds: string[] = []) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to recruiter's own alerts (new applicants, system messages)
    const alertChannel = subscribeToAlerts(user.id, (payload: any) => {
      const alert   = payload?.new;
      if (!alert) return;

      const title   = (alert.title   as string) ?? 'New notification';
      const message = (alert.message as string) ?? '';

      // Plain string toast — no JSX required
      toast(`👤 ${title}\n${message}`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background:   '#0F1526',
          color:        '#F1F5F9',
          border:       '1px solid rgba(244,114,182,0.2)',
          borderRadius: '12px',
          fontSize:     '13px',
          maxWidth:     '360px',
          padding:      '14px 16px',
        },
      });

      // Refresh recruiter job stats and alert count
      queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['alerts', user.id] });
    });

    // Subscribe to live applicant stream for each active job
    const jobChannels = jobIds.map(jobId =>
      subscribeToJobApplicants(jobId, () => {
        queryClient.invalidateQueries({ queryKey: ['job-applicants', jobId] });
        queryClient.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      }),
    );

    return () => {
      unsubscribe(alertChannel);
      jobChannels.forEach(unsubscribe);
    };
  // jobIds.join(',') prevents unnecessary re-subscriptions when array
  // reference changes but contents are the same
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, jobIds.join(','), queryClient]);
}
