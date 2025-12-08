/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

export type RoleRec = {
  role: string;
  match: number;
  rationale: string;
  resources: { title: string; url: string; type: string }[];
};

export function getRecommendations(result: any): RoleRec[] {
  const recs = Array.isArray(result?.roleRecommendations) ? result.roleRecommendations : [];
  return recs.sort((a: RoleRec, b: RoleRec) => b.match - a.match);
}