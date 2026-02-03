export default function Footer() {
  return (
    <footer className="bg-[var(--panel)] border-t border-[var(--border)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-[var(--muted)]">
          <a href="#about" className="hover:text-[var(--accent-strong)] transition-colors">
            About
          </a>
          <span className="hidden sm:inline text-slate-300">|</span>
          <a href="#contact" className="hover:text-[var(--accent-strong)] transition-colors">
            Contact
          </a>
          <span className="hidden sm:inline text-slate-300">|</span>
          <a href="#credits" className="hover:text-[var(--accent-strong)] transition-colors">
            Credits
          </a>
        </div>
        <div className="text-center mt-4 text-xs text-slate-500">
          &copy; 2026 TripPilot AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
