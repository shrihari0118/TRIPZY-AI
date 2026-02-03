import { Mail, MapPin, Phone, User } from 'lucide-react';

export default function Profile() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Student Profile
          </p>
          <h1 className="text-3xl font-semibold text-[var(--ink)]">
            Pitch-Ready Identity Snapshot
          </h1>
          <p className="text-[var(--muted)] max-w-2xl">
            A clean overview of the student planner profile to showcase
            personalization without backend complexity.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
                <User className="h-7 w-7 text-[var(--accent-strong)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--ink)]">
                  Arjun Mehta
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Final Year, Computer Science
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--accent)]" />
                arjun.mehta@campus.edu
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--accent)]" />
                +91 98900 12345
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                Pune, Maharashtra
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {['Budget Aware', 'Weekend Trips', 'Cultural Experiences'].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--ink)]">
              Planner Preferences
            </h3>
            <p className="text-sm text-[var(--muted)] mt-2">
              These controls reflect a future-ready personalization engine.
            </p>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
                <span className="text-[var(--muted)]">Preferred Budget</span>
                <span className="font-semibold text-[var(--ink)]">
                  Moderate
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
                <span className="text-[var(--muted)]">Travel Style</span>
                <span className="font-semibold text-[var(--ink)]">
                  Slow &amp; Scenic
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-muted)] px-4 py-3">
                <span className="text-[var(--muted)]">AI Coach Mode</span>
                <span className="font-semibold text-[var(--ink)]">On</span>
              </div>
            </div>

            <button className="mt-6 w-full rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900">
              Edit Preferences
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
