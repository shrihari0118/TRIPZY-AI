import { Compass, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const navItems = [
    {
      path: '/translator',
      label: 'Translator',
      activePaths: ['/translator', '/dashboard/translate'],
    },
    {
      path: '/budget',
      label: 'Budget Planner',
      activePaths: ['/budget', '/dashboard/budget'],
    },
    { path: '/profile', label: 'Profile', activePaths: ['/profile'] },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="rounded-2xl bg-[var(--accent)] p-2.5 shadow-sm">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                TripPilot AI
              </p>
              <h1 className="text-lg font-semibold text-[var(--ink)]">
                Intelligent Travel Planner
              </h1>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const isActive = item.activePaths.includes(location.pathname);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-transparent bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-sm'
                        : 'border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
