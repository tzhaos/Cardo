import { useAboutSettings } from '../hooks/useAboutSettings';

function AboutStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="kb-soft-card rounded-2xl border px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-win-text-secondary">{label}</div>
      <div className="mt-2 text-lg font-semibold text-win-text">{value}</div>
    </div>
  );
}

export function AboutPanel() {
  const settings = useAboutSettings();

  return (
    <div className="flex flex-col gap-4">
      <div className="kb-soft-card rounded-2xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-win-text">{settings.brand}</div>
          </div>
          <div className="kb-soft-button rounded-full border px-3 py-1 text-sm font-medium text-win-text">
            {settings.versionBadge}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {settings.stats.map((stat) => (
            <AboutStat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>
    </div>
  );
}
