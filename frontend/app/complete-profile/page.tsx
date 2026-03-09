'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

export default function CompleteProfile() {
  const { user } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      role,
      bio,
      skills: skills.split(',').map((s) => s.trim()),
      linkedin,
    });

    setLoading(false);

    if (!error) {
      router.push('/dashboard');
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-6 bg-background border border-border p-8 rounded-xl shadow-sm"
      >
        <h2 className="text-2xl font-semibold">Complete Your Profile</h2>

        <input
          type="text"
          placeholder="Full Name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-border rounded-lg px-4 py-2"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="w-full border border-border rounded-lg px-4 py-2"
        >
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
        </select>

        <textarea
          placeholder="Short Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border border-border rounded-lg px-4 py-2"
        />

        <input
          type="text"
          placeholder="Skills (comma separated)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className="w-full border border-border rounded-lg px-4 py-2"
        />

        <input
          type="url"
          placeholder="LinkedIn URL"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          className="w-full border border-border rounded-lg px-4 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}