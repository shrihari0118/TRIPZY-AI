import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type ItineraryLayoutProps = {
  title: string;
  previousPath?: string;
  nextPath?: string;
  children: ReactNode;
  showPayButton?: boolean;
};

export default function ItineraryLayout({
  title,
  previousPath,
  nextPath,
  children,
  showPayButton = true,
}: ItineraryLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Itinerary
            </p>
            <h1 className="text-3xl font-semibold text-[var(--ink)]">{title}</h1>
          </div>
        </section>

        {children}

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => previousPath && navigate(previousPath)}
              disabled={!previousPath}
              className="rounded-2xl border border-[var(--border)] bg-[var(--panel-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {showPayButton && (
              <button
                type="button"
                onClick={() => window.alert('payment successful')}
                className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Pay Now
              </button>
            )}

            <button
              type="button"
              onClick={() => nextPath && navigate(nextPath)}
              disabled={!nextPath}
              className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
