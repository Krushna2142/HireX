'use client';
import SettingsForm from '@/features/settings/components/SettingForm';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm opacity-70">
          Update profile preferences. (Auth pending; currently local-only.)
        </p>
      </header>
      <SettingsForm />
    </div>
  );
}