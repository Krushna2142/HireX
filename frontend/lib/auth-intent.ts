import type { PublicAuthRole } from '@/lib/auth';

export type AuthIntent = PublicAuthRole;

const KEY = 'hx_intended_role';
const VALID: readonly AuthIntent[] = ['candidate', 'recruiter', 'placement'];

// Registration intent only. NOT proof of role. Backend decides role from DB.
// sessionStorage: tab-scoped, survives OAuth redirect.

export function setIntendedRole(role: AuthIntent): void {
  try {
    sessionStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
}

export function getIntendedRole(): AuthIntent | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return VALID.includes(v as AuthIntent) ? (v as AuthIntent) : null;
  } catch {
    return null;
  }
}

export function clearIntendedRole(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}