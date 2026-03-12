/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

const schema = z.object({
  name: z.string().min(2).max(50),
  headline: z.string().max(120).optional(),
  location: z.string().max(80).optional(),
  bio: z.string().max(400).optional()
});

type Values = z.infer<typeof schema>;

export default function SettingsForm() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      headline: '',
      location: '',
      bio: ''
    }
  });

  useEffect(() => {
    api.get('/users/me').then((res) => {
      const profile = res.data;
      reset({
        name: profile.full_name || '',
        headline: profile.headline || '',
        location: profile.location || '',
        bio: profile.bio || '',
      });
    }).catch(() => {
      setLoadError('Failed to load profile. Please refresh and try again.');
    });
  }, [reset]);

  async function onSubmit(values: Values) {
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const res = await api.patch('/users/me', {
        full_name: values.name,
        headline: values.headline,
        location: values.location,
        bio: values.bio,
      });
      setSaveSuccess(true);
      return res.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile. Please try again.';
      setSaveError(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border p-6 shadow-sm dark:border-neutral-800"
    >
      {loadError && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Name</label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">
          Professional Headline
        </label>
        <Input {...register('headline')} placeholder="e.g. Senior Backend Engineer" />
        {errors.headline && <p className="text-xs text-red-600">{errors.headline.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Location</label>
        <Input {...register('location')} placeholder="City, Country" />
        {errors.location && <p className="text-xs text-red-600">{errors.location.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-70">Bio</label>
        <Textarea {...register('bio')} rows={5} placeholder="Short professional summary..." />
        {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
      </div>

      {saveSuccess && (
        <p className="text-sm text-green-600">Profile saved successfully.</p>
      )}
      {saveError && (
        <p className="text-sm text-red-600">{saveError}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}