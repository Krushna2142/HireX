'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { getToken } from '@/lib/auth';
import React, { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ResumeUploadPage() {
  const { user } = useAuth(); // ← typo fixed

  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | null) => {
      setErrorMsg('');
      setStatus('');

      if (!file) {
        setErrorMsg('Please select a file.');
        return;
      }

      if (!user) {
        setErrorMsg('You must be logged in.');
        return;
      }

      const allowed = /\.(pdf|docx)$/i.test(file.name);

      if (!allowed) {
        setErrorMsg('Only PDF or DOCX files are supported.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File must be under 5MB.');
        return;
      }

      try {
        setUploading(true);
        setStatus('Uploading resume...');

        const token = await getToken();

        if (!token) throw new Error('Authentication token missing');

        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch(`${API_URL}/resumes/upload-raw`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Upload failed');
        }

        setStatus('✅ Resume uploaded successfully');
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [user]
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Upload Resume</h1>

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        disabled={uploading}
        className="border p-2"
      />

      {uploading && <div className="text-blue-600">Uploading...</div>}
      {status && <div className="text-green-600">{status}</div>}
      {errorMsg && <div className="text-red-600">{errorMsg}</div>}
    </div>
  );
}