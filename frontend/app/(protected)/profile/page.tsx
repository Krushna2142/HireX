'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import CandidateProfilePage from '@/app/_components/profiles/CandidateProfilePage';
import RecruiterProfilePage from '@/app/_components/profiles/RecruiterProfilePage';

export default function ProfilePage() {
  const { user } = useAuth();

  if (user?.role === 'recruiter') {
    return <RecruiterProfilePage />;
  }

  return <CandidateProfilePage />;
}

/*
---

## Move Profile Components Into `_components`

Since Next.js treats all folders inside `app/` as routes, your profile page components should live in `_components/` (the underscore prefix prevents Next.js from treating them as route segments).
```
app/
└── _components/
    ├── dashboards/
    │   ├── CandidateDashboard.tsx    ← moved here from earlier
    │   └── RecruiterDashboard.tsx
    ├── profiles/
    │   ├── CandidateProfilePage.tsx  ← move the candidate profile component here
    │   └── RecruiterProfilePage.tsx  ← move the recruiter profile component here
    └── shared/
        ├── TagInput.tsx              ← extract reusable TagInput
        └── LoadingSpinner.tsx


        */