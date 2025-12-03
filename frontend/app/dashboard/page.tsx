'use client';

import { useAuth } from "@/components/user-auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import JobCard3D from "@/components/dashboard/JobCard3D";
import NeonBlob from "@/components/visuals/NeonBlob";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-card-foreground">
              Authentication Required
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in to access your dashboard and track your job applications.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={signIn}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium transition hover:bg-muted"
            >
              Go back home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render dashboard for authenticated users
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-10">
        <div className="relative overflow-hidden">
          <NeonBlob className="left-6 top-6 h-96 w-96 from-indigo-300 to-pink-300 bg-gradient-to-tr" />
          
          <section className="grid gap-6 md:grid-cols-3">
            <div className="col-span-2 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm glass">
                <h2 className="text-2xl font-semibold">Hi, {user.name || 'there'} — your AI action plan</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Smart recommendations and an adaptive job tracker — configure alerts and upload your resume to boost matches.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <JobCard3D 
                  title="Senior Backend Engineer" 
                  company="ExampleCorp" 
                  location="Remote" 
                  tags={["python","docker","postgres"]} 
                />
                <JobCard3D 
                  title="ML Engineer" 
                  company="AIlabs" 
                  location="Berlin" 
                  tags={["transformers","k8s"]} 
                />
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="text-sm font-medium">Resume & Profile</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Create a new resume to get started
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => router.push("/resume")}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition"
                  >
                    Create New Base Resume
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="text-sm font-medium">Progress</div>
                <div className="mt-3">
                  <div className="h-3 w-full rounded bg-muted">
                    <div className="h-3 w-1/3 rounded bg-primary" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    1 of 3 completed
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
