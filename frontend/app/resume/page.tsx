/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { getToken } from '@/lib/auth';
import React, { useState, useCallback, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ALLOWED_EXTENSIONS = /\.(pdf|docx|doc)$/i;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const isPdf = type.includes('pdf');
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill={isPdf ? '#7C3AED' : '#1D4ED8'} fillOpacity="0.12" />
      <path
        d="M8 6h8l6 6v14a1 1 0 01-1 1H8a1 1 0 01-1-1V7a1 1 0 011-1z"
        stroke={isPdf ? '#7C3AED' : '#1D4ED8'}
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      <path d="M16 6v6h6" stroke={isPdf ? '#7C3AED' : '#1D4ED8'} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <text x="9" y="20" fontSize="6" fontWeight="700" fill={isPdf ? '#7C3AED' : '#1D4ED8'} fontFamily="monospace">
        {isPdf ? 'PDF' : 'DOC'}
      </text>
    </svg>
  );
}

export default function ResumeUploadPage() {
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | null) => {
      setErrorMsg('');
      setFileInfo(null);

      if (!file) return;
      if (!user) return setErrorMsg('You must be logged in to upload a resume.');
      if (!ALLOWED_EXTENSIONS.test(file.name))
        return setErrorMsg('Only PDF or DOCX files are supported.');
      if (file.size > MAX_SIZE_BYTES)
        return setErrorMsg('File must be under 5MB.');
      if (!API_URL) return setErrorMsg('API URL is not configured.');

      setFileInfo({ name: file.name, size: file.size, type: file.type });
      setUploadState('uploading');
      setProgress(0);

      // Animate progress bar
      const interval = setInterval(() => {
        setProgress((p) => (p < 85 ? p + Math.random() * 15 : p));
      }, 200);

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication token missing. Please log in again.');

        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch(`${API_URL}/resumes/upload-raw`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        clearInterval(interval);

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ message: 'Upload failed' }));
          throw new Error(data.message || `Upload failed with status ${resp.status}`);
        }

        setProgress(100);
        setTimeout(() => setUploadState('success'), 300);
      } catch (err: any) {
        clearInterval(interval);
        setErrorMsg(err.message || 'Upload failed. Please try again.');
        setUploadState('error');
      }
    },
    [user],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0] ?? null);
    },
    [handleFile],
  );

  const reset = () => {
    setUploadState('idle');
    setErrorMsg('');
    setFileInfo(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        .ru-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #0A0A0F;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .ru-card {
          width: 100%;
          max-width: 560px;
          background: #111118;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .ru-card::before {
          content: '';
          position: absolute;
          top: -1px; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168,85,247,0.6), transparent);
        }

        .ru-ambient {
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .ru-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.25);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          color: #A78BFA;
          letter-spacing: 0.04em;
          margin-bottom: 1.5rem;
        }

        .ru-label-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #A78BFA;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .ru-title {
          font-size: 26px;
          font-weight: 600;
          color: #F1F0FF;
          letter-spacing: -0.03em;
          line-height: 1.25;
          margin: 0 0 0.5rem;
        }

        .ru-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.38);
          margin: 0 0 2rem;
          line-height: 1.6;
        }

        .ru-dropzone {
          border: 1.5px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 2.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.02);
          position: relative;
        }

        .ru-dropzone:hover, .ru-dropzone.drag {
          border-color: rgba(124,58,237,0.5);
          background: rgba(124,58,237,0.04);
        }

        .ru-dropzone.drag {
          transform: scale(1.01);
        }

        .ru-icon-wrap {
          width: 56px; height: 56px;
          border-radius: 14px;
          background: rgba(124,58,237,0.1);
          border: 1px solid rgba(124,58,237,0.2);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }

        .ru-drop-title {
          font-size: 15px;
          font-weight: 500;
          color: #E2E0FF;
          margin-bottom: 6px;
        }

        .ru-drop-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }

        .ru-drop-sub span {
          color: #A78BFA;
          font-weight: 500;
        }

        .ru-constraints {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 1.25rem;
        }

        .ru-pill {
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 3px 10px;
          letter-spacing: 0.04em;
        }

        .ru-file-preview {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 14px 16px;
          margin-top: 1.25rem;
        }

        .ru-file-info { flex: 1; min-width: 0; }

        .ru-file-name {
          font-size: 13px;
          font-weight: 500;
          color: #E2E0FF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }

        .ru-file-size {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          font-family: 'DM Mono', monospace;
        }

        .ru-progress-wrap {
          margin-top: 16px;
        }

        .ru-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .ru-progress-label {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        .ru-progress-pct {
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          color: #A78BFA;
        }

        .ru-bar-track {
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
        }

        .ru-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7C3AED, #A78BFA);
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        .ru-success {
          text-align: center;
          padding: 1.5rem 0;
        }

        .ru-success-icon {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }

        .ru-success-title {
          font-size: 16px;
          font-weight: 600;
          color: #6EE7B7;
          margin-bottom: 6px;
        }

        .ru-success-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 1.5rem;
        }

        .ru-error-box {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 1rem;
        }

        .ru-error-icon {
          width: 18px; height: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .ru-error-text {
          font-size: 13px;
          color: #FCA5A5;
          line-height: 1.5;
        }

        .ru-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }

        .ru-btn-primary {
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          color: #fff;
          box-shadow: 0 0 0 1px rgba(124,58,237,0.3), 0 4px 20px rgba(124,58,237,0.2);
          margin-top: 1.25rem;
        }

        .ru-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          box-shadow: 0 0 0 1px rgba(124,58,237,0.5), 0 8px 24px rgba(124,58,237,0.3);
          transform: translateY(-1px);
        }

        .ru-btn-primary:active:not(:disabled) { transform: translateY(0); }

        .ru-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ru-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          margin-top: 0.75rem;
        }

        .ru-btn-ghost:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.7);
        }

        .ru-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 2rem 0 1.25rem;
        }

        .ru-formats {
          display: flex;
          gap: 10px;
        }

        .ru-format-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .ru-format-label {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          line-height: 1.4;
        }

        .ru-format-name {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
        }

        .ru-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ru-animate { animation: fadeIn 0.3s ease forwards; }

        @keyframes checkPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        .ru-check-animate { animation: checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      <div className="ru-root">
        <div className="ru-card">
          <div className="ru-ambient" />

          <div className="ru-label">
            <div className="ru-label-dot" />
            resume.upload
          </div>

          <h1 className="ru-title">Upload your resume</h1>
          <p className="ru-subtitle">
            Drop your file below and we'll parse, analyze, and match you to relevant jobs automatically.
          </p>

          {/* ── SUCCESS STATE ── */}
          {uploadState === 'success' && fileInfo && (
            <div className="ru-success ru-animate">
              <div className="ru-success-icon">
                <svg className="ru-check-animate" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="ru-success-title">Resume uploaded</div>
              <div className="ru-success-sub">{fileInfo.name} · {formatBytes(fileInfo.size)}</div>
              <button className="ru-btn ru-btn-primary" onClick={reset}>
                Upload another
              </button>
            </div>
          )}

          {/* ── UPLOAD / IDLE / ERROR STATE ── */}
          {uploadState !== 'success' && (
            <>
              <div
                className={`ru-dropzone${isDragging ? ' drag' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  disabled={uploadState === 'uploading'}
                />

                <div className="ru-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V8m0-4l-4 4m4-4l4 4" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#A78BFA" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="ru-drop-title">
                  {isDragging ? 'Drop it here' : 'Drag & drop your resume'}
                </div>
                <div className="ru-drop-sub">
                  or <span>browse files</span> from your computer
                </div>

                <div className="ru-constraints">
                  <span className="ru-pill">PDF</span>
                  <span className="ru-pill">DOCX</span>
                  <span className="ru-pill">DOC</span>
                  <span className="ru-pill">max 5 MB</span>
                </div>
              </div>

              {/* File preview + progress */}
              {fileInfo && uploadState === 'uploading' && (
                <div className="ru-animate">
                  <div className="ru-file-preview">
                    <FileIcon type={fileInfo.type} />
                    <div className="ru-file-info">
                      <div className="ru-file-name">{fileInfo.name}</div>
                      <div className="ru-file-size">{formatBytes(fileInfo.size)}</div>
                    </div>
                  </div>

                  <div className="ru-progress-wrap">
                    <div className="ru-progress-header">
                      <span className="ru-progress-label">Uploading to secure storage…</span>
                      <span className="ru-progress-pct">{Math.round(progress)}%</span>
                    </div>
                    <div className="ru-bar-track">
                      <div className="ru-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="ru-error-box ru-animate">
                  <svg className="ru-error-icon" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" stroke="#F87171" strokeWidth="1.5" />
                    <path d="M9 5.5v4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="12.5" r="0.75" fill="#F87171" />
                  </svg>
                  <span className="ru-error-text">{errorMsg}</span>
                </div>
              )}

              <button
                className="ru-btn ru-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState === 'uploading'}
              >
                {uploadState === 'uploading' ? (
                  <><div className="ru-spinner" />Uploading…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 11V5m0-2L5 6m3-3l3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Select resume
                  </>
                )}
              </button>

              {uploadState === 'error' && (
                <button className="ru-btn ru-btn-ghost" onClick={reset}>
                  Try again
                </button>
              )}

              <div className="ru-divider" />

              <div className="ru-formats">
                <div className="ru-format-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#6D28D9" strokeWidth="1.25" />
                    <path d="M5 5h6M5 8h6M5 11h4" stroke="#6D28D9" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  <div className="ru-format-label">
                    <div className="ru-format-name">PDF</div>
                    Preferred format
                  </div>
                </div>
                <div className="ru-format-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="1" width="10" height="14" rx="2" stroke="#1D4ED8" strokeWidth="1.25" />
                    <path d="M5 5h6M5 8h6M5 11h4" stroke="#1D4ED8" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  <div className="ru-format-label">
                    <div className="ru-format-name">DOCX / DOC</div>
                    Word documents
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}