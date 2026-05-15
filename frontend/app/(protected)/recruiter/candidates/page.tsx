// frontend/app/(protected)/recruiter/candidates/page.tsx

import { redirect } from 'next/navigation';

export default function RecruiterCandidatesRedirectPage() {
  redirect('/recruiter/dashboard?tab=applications');
}