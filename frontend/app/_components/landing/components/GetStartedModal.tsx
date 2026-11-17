import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { validateDemoRequest, type DemoRequestInput } from '../utils/hirexLogic';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  const [form, setForm] = useState<DemoRequestInput>({
    name: '',
    email: '',
    role: 'Recruiter',
    organization: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DemoRequestInput, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDemoRequest(form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setErrors({});
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#080F1D] p-6 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={handleResetAndClose}
          aria-label="Close walkthrough modal"
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {!submitted ? (
          <>
            <p className="text-xs font-medium text-cyan-300">
              HireX Motion Lab · Interactive Demo Request
            </p>
            <h3
              id="get-started-title"
              className="font-display mt-2 text-2xl font-bold text-white"
            >
              Explore the HireX Walkthrough
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              This is an experimental frontend showcase. Submitting previews the local confirmation flow with zero external backend submission.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="demo-name" className="block text-xs font-medium text-slate-300">
                  Full Name
                </label>
                <input
                  id="demo-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Riya Sharma"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#04070D] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                {errors.name && <p className="mt-1 text-xs text-amber-300">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="demo-email" className="block text-xs font-medium text-slate-300">
                  Work or Campus Email
                </label>
                <input
                  id="demo-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="riya@campus.edu"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#04070D] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                {errors.email && <p className="mt-1 text-xs text-amber-300">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="demo-role" className="block text-xs font-medium text-slate-300">
                  Primary Perspective
                </label>
                <select
                  id="demo-role"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as DemoRequestInput['role'],
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#04070D] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Candidate">Candidate</option>
                  <option value="Recruiter">Recruiter</option>
                  <option value="College / TPO">College / TPO</option>
                </select>
              </div>

              <div>
                <label htmlFor="demo-org" className="block text-xs font-medium text-slate-300">
                  Organization or College
                </label>
                <input
                  id="demo-org"
                  type="text"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  placeholder="Apex Institute of Technology"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#04070D] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                {errors.organization && (
                  <p className="mt-1 text-xs text-amber-300">{errors.organization}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 cursor-pointer"
              >
                Confirm Demo Walkthrough
              </button>
            </form>
          </>
        ) : (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-cyan-300" />
            <h3 className="font-display mt-4 text-xl font-bold text-white">
              Demo Preview Confirmed
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Ready for <span className="font-semibold text-white">{form.name}</span> ({form.role} ·{' '}
              {form.organization}). No production account was created—explore all interactive chapters directly on the page.
            </p>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-6 rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 cursor-pointer"
            >
              Continue Exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
