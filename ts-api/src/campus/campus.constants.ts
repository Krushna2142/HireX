// ts-api/src/campus/campus.constants.ts
export const CAMPUS_QUEUE = 'campus-operations';

export const CAMPUS_JOB = {
  IMPORT_STUDENTS: 'import-students',
  BULK_STATUS: 'bulk-status',
  BULK_NOTIFY: 'bulk-notify',
  EXPORT: 'export',
} as const;

export const CAMPUS_EXPORT_BUCKET = 'campus-exports';

export const BULK_CHUNK_SIZE = 250;

export const CAMPUS_ROLES = {
  RECRUITER: 'recruiter',
  COLLEGE_ADMIN: 'college_admin',
  TPO: 'tpo',
  COORDINATOR: 'placement_coordinator',
  STUDENT: 'candidate',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export const COLLEGE_STAFF = [
  CAMPUS_ROLES.COLLEGE_ADMIN,
  CAMPUS_ROLES.TPO,
  CAMPUS_ROLES.COORDINATOR,
] as string[];

export const COLLEGE_MANAGERS = [
  CAMPUS_ROLES.COLLEGE_ADMIN,
  CAMPUS_ROLES.TPO,
] as string[];