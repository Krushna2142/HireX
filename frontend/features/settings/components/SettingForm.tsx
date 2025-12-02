'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(2).max(50),
  headline: z.string().max(120).optional(),
  location: z.string().max(80).optional(),
  bio: z.string().max(400).optional()
});

type Values = z.infer<typeof schema>;

export default function SettingsForm() {
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

  function onSubmit(values: Values) {
    // Placeholder: would call PATCH /api/me
    return new Promise<void>(resolve =>
      setTimeout(() => {
        console.log('Settings saved', values);
        resolve();
      }, 800)
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border p-6 shadow-sm dark:border-neutral-800"
    >
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
        <TextArea {...register('bio')} rows={5} placeholder="Short professional summary..." />
        {errors.bio && <p className="text-xs text-red-600">{errors.bio.message}</p>}
      </div>

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