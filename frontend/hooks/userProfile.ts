/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCandidateProfile, updateCandidateProfile,
  fetchRecruiterProfile, updateRecruiterProfile,
  fetchProfileCompletion, CandidateProfile, RecruiterProfile,
} from '@/lib/api/profiles';
import toast from 'react-hot-toast';

// ── Query keys ────────────────────────────────────────────────────────────────

export const PROFILE_KEYS = {
  candidate:  ['profile', 'candidate']  as const,
  recruiter:  ['profile', 'recruiter']  as const,
  completion: ['profile', 'completion'] as const,
};

// ── Candidate hooks ───────────────────────────────────────────────────────────

export function useCandidateProfile() {
  return useQuery({
    queryKey: PROFILE_KEYS.candidate,
    queryFn:  fetchCandidateProfile,
    staleTime: 60_000,
  });
}

export function useUpdateCandidateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CandidateProfile>) =>
      updateCandidateProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEYS.candidate, updated);
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}

export function useProfileCompletion() {
  return useQuery({
    queryKey: PROFILE_KEYS.completion,
    queryFn:  fetchProfileCompletion,
    staleTime: 30_000,
  });
}

// ── Recruiter hooks ───────────────────────────────────────────────────────────

export function useRecruiterProfile() {
  return useQuery({
    queryKey: PROFILE_KEYS.recruiter,
    queryFn:  fetchRecruiterProfile,
    staleTime: 60_000,
  });
}

export function useUpdateRecruiterProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<RecruiterProfile>) =>
      updateRecruiterProfile(dto),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEYS.recruiter, updated);
      toast.success('Company profile updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });
}