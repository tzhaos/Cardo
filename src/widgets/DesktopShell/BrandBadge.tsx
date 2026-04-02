interface BrandBadgeProps {
  label: string;
}

export default function BrandBadge({ label }: BrandBadgeProps) {
  return (
    <div className="kb-brand-shell pointer-events-none absolute left-6 top-6 z-0 flex select-none items-center gap-2 opacity-70">
      <div className="kb-brand-mark flex h-8 w-8 items-center justify-center rounded-xl border backdrop-blur-md">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
      <span className="kb-brand-text font-semibold tracking-wide">{label}</span>
    </div>
  );
}
