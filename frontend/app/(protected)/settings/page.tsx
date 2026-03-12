'use client';

import SettingsForm from '@/features/settings/components/SettingForm';

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">Update your profile preferences.</p>
      <section className="mt-6">
        <SettingsForm />
      </section>
    </main>
  );
}