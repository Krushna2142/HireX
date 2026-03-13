'use client';
import { useAuth } from '@/components/providers/AuthProvider';
import { getToken } from '@/lib/auth';
import React, { useState, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ResumeUploadPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | null) => {
      setErrorMsg('');
      setStatus('');
      if (!file) { setErrorMsg('Please select a file.'); return; }
      if (!user) { setErrorMsg('You must be logged in.'); return; }

      const allowed = file.name.endsWith('.pdf') || file.name.endsWith('.docx');
      if (!allowed) { setErrorMsg('Only PDF or DOCX files are supported.'); return; }

      try {
        setUploading(true);
        setStatus('Uploading...');
        const token = await getToken();
        if (!token) throw new Error('Authentication token missing');

        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch(`${API_URL}/resumes/upload-raw`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        if (!resp.ok) throw new Error(`Failed: ${await resp.text()}`);

        setStatus('Upload done!');
      } catch (err: any) {
        setErrorMsg(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    }, [user]
  );

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={e => handleFile(e.target.files?.[0] || null)}
        disabled={uploading}
      />
      {status && <div className="text-green-600">{status}</div>}
      {errorMsg && <div className="text-red-600">{errorMsg}</div>}
    </div>
  );
}