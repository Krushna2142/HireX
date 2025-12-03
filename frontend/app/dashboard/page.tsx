// app/dashboard/page.tsx
import AdvancedShell from "../_components/AdvancedShell";
import JobCard3D from "@/components/dashboard/JobCard3D";
import NeonBlob from "@/components/visuals/NeonBlob";

export default function DashboardLanding() {
  return (
    <AdvancedShell>
      <div className="relative overflow-hidden">
        <NeonBlob className="left-6 top-6 h-96 w-96 from-indigo-300 to-pink-300 bg-gradient-to-tr" />
        <section className="grid gap-6 md:grid-cols-3">
          <div className="col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm glass">
              <h2 className="text-2xl font-semibold">Hi, Krushna — your AI action plan</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Smart recommendations and an adaptive job tracker — configure alerts and upload your resume to boost matches.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <JobCard3D title="Senior Backend Engineer" company="ExampleCorp" location="Remote" tags={["python","docker","postgres"]} />
              <JobCard3D title="ML Engineer" company="AIlabs" location="Berlin" tags={["transformers","k8s"]} />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">Resume & Profile</div>
              <div className="mt-3 text-sm text-muted-foreground">Create a new resume to get started</div>
              <div className="mt-4">
                <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Create New Base Resume</button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">Progress</div>
              <div className="mt-3">
                <div className="h-3 w-full rounded bg-muted">
                  <div className="h-3 w-1/3 rounded bg-primary" />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">1 of 3 completed</div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AdvancedShell>
  );
}
