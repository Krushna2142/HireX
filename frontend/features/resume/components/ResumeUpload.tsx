// frontend/features/resume/components/ResumeUpload.tsx
'use client';

import { useRouter } from 'next/navigation';

// Thin wrapper that delegates to the actual resume page
// Keeps the import contract satisfied without duplicating logic
export default function ResumeUpload() {
  const router = useRouter();

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '60vh',
      gap:            '1rem',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
        Resume upload has moved.
      </p>
      <button
        onClick={() => router.push('/resumes')}
        style={{
          padding:      '10px 24px',
          background:   'linear-gradient(135deg, #7C3AED, #6D28D9)',
          border:       'none',
          borderRadius: '10px',
          color:        '#fff',
          fontSize:     '13px',
          fontWeight:    600,
          cursor:       'pointer',
        }}
      >
        Go to Resume Upload
      </button>
    </div>
  );
}
