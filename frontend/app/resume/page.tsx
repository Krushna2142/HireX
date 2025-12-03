'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Upload, FileText } from 'lucide-react';

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [summary, setSummary] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1: No backend wiring, just show console log
    console.log('Resume upload stub:', { file, name, email, summary });
    alert('Resume upload feature coming soon! Your data has been logged to console.');
  };

  return (
    <main className="page-gradient mx-auto max-w-4xl px-4 py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resume Upload</h1>
          <p className="mt-2 text-muted-foreground">
            Upload your resume and profile information to get personalized job recommendations and optimize your applications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-card-foreground">
              Resume File
            </label>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm transition hover:bg-muted">
                <Upload className="h-4 w-4" />
                {file ? file.name : 'Choose file'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX (max 5MB)
            </p>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-card-foreground">
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              required
            />
          </div>

          {/* Summary Field */}
          <div className="space-y-2">
            <label htmlFor="summary" className="block text-sm font-medium text-card-foreground">
              Professional Summary
            </label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief overview of your professional background, key skills, and career objectives..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add a summary to help our AI better understand your profile
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary">
              Upload Resume
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setFile(null);
                setName('');
                setEmail('');
                setSummary('');
              }}
            >
              Clear Form
            </Button>
          </div>
        </form>

        {/* Information Card */}
        <div className="rounded-2xl border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-card-foreground">
            Why Upload Your Resume?
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Get AI-powered job recommendations tailored to your experience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Automatically extract skills and optimize for ATS systems</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Generate personalized cover letters for each application</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Track your application history and get interview insights</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}