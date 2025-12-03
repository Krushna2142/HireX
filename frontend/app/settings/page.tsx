'use client';

import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/TextArea';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">Update profile preferences. (Auth pending; currently local-only.)</p>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground">NAME</label>
            <Input placeholder="Your name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground">PROFESSIONAL HEADLINE</label>
            <Input placeholder="e.g. Senior Backend Engineer" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground">LOCATION</label>
            <Input placeholder="City, Country" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground">BIO</label>
            <Textarea placeholder="Short professional summary..." rows={6} />
          </div>
        </div>
      </section>
    </main>
  );
}