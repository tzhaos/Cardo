interface BrandBadgeProps {
  label: string;
}

export default function BrandBadge({ label }: BrandBadgeProps) {
  return (
    <div className="kb-brand-shell pointer-events-none fixed left-6 top-4 z-[99993] flex h-12 select-none items-center gap-3">
      <div className="kb-brand-mark flex h-7 w-7 items-center justify-center rounded-full border">
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
      <span className="kb-brand-text text-sm font-semibold">{label}</span>
    </div>
  );
}
