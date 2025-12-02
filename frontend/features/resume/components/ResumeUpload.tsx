'use client';
import { useState, DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { FileText, UploadCloud } from 'lucide-react';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export default function ResumeUpload() {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [drag, setDrag] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile({ name: f.name, size: f.size, type: f.type });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile({ name: f.name, size: f.size, type: f.type });
  }

  function handleParse() {
    if (!file) return;
    setLoading(true);
    setTimeout(() => {
      // Placeholder parsing
      setParsedSkills(['python', 'fastapi', 'react', 'postgres', 'docker']);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div
        onDragEnter={e => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={e => e.preventDefault()}
        onDragLeave={e => {
          e.preventDefault();
          setDrag(false);
        }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          drag
            ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
            : 'border-indigo-300 dark:border-indigo-700'
        }`}
      >
        <UploadCloud className="mb-3 text-indigo-600 dark:text-indigo-400" size={32} />
        <p className="text-sm opacity-80">
          {file ? (
            <>
              <span className="font-medium">{file.name}</span> selected –{' '}
              {(file.size / 1024).toFixed(1)} KB
            </>
          ) : (
            'Drag & drop your resume PDF here or click to select.'
          )}
        </p>
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          type="file"
          accept="application/pdf"
          onChange={handleSelect}
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={handleParse} disabled={!file || loading}>
          {loading ? 'Parsing…' : 'Parse Resume'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setParsedSkills([]);
          }}
        >
          Reset
        </Button>
      </div>

      {parsedSkills.length > 0 && (
        <div className="space-y-3 rounded-xl border p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FileText size={18} /> Extracted Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {parsedSkills.map(s => (
              <span
                key={s}
                className="rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}