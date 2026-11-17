export type AuthIntent = 'candidate' | 'recruiter';

const KEY = 'hx_intended_role';

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
    return v === 'candidate' || v === 'recruiter' ? v : null;
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