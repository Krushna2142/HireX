/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCandidateProfile, updateCandidateProfile,
  fetchRecruiterProfile, updateRecruiterProfile,
  fetchProfileCompletion, CandidateProfile, RecruiterProfile,
} from '@/lib/api/profiles';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';

// ── Query keys ────────────────────────────────────────────────────────────────

export const PROFILE_KEYS = {
  candidate:  ['profile', 'candidate']  as const,
  recruiter:  ['profile', 'recruiter']  as const,
  completion: ['profile', 'completion'] as const,
};

// A confirmed 404 is a real answer; do not hammer it. Other errors get one retry.
const noRetryOn404 = (count: number, err: any) =>
  err?.response?.status !== 404 && count < 1;

// ── Candidate hooks ───────────────────────────────────────────────────────────

export function useCandidateProfile() {
  const { user, loading } = useAuth();

  return useQuery({
    // Per-user cache key: one account's cached profile can never show for another.
    queryKey: [...PROFILE_KEYS.candidate, user?.id ?? null],
    queryFn:  fetchCandidateProfile,
    // Session init incomplete or signed out → do not fetch, do not treat as "no profile".
    enabled:  !loading && !!user,
    retry:    noRetryOn404,
    staleTime: 60_000,
  });
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (dto: Partial<CandidateProfile>) =>
      updateCandidateProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData([...PROFILE_KEYS.candidate, user?.id ?? null], updated);
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}

export function useProfileCompletion() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: [...PROFILE_KEYS.completion, user?.id ?? null],
    queryFn:  fetchProfileCompletion,
    enabled:  !loading && !!user,
    staleTime: 30_000,
  });
}

// ── Recruiter hooks ───────────────────────────────────────────────────────────

export function useRecruiterProfile() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: [...PROFILE_KEYS.recruiter, user?.id ?? null],
    queryFn:  fetchRecruiterProfile,
    enabled:  !loading && !!user,
    retry:    noRetryOn404,
    staleTime: 60_000,
  });
}

export function useUpdateRecruiterProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (dto: Partial<RecruiterProfile>) =>
      updateRecruiterProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData([...PROFILE_KEYS.recruiter, user?.id ?? null], updated);
      toast.success('Company profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}