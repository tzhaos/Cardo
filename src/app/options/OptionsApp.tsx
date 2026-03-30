import { useSettingsStore } from '../../domains/settings/store/useSettingsStore';

export default function OptionsApp() {
  const defaultNewBoxLayout = useSettingsStore((state) => state.defaultNewBoxLayout);
  const allowLocalResourceLaunch = useSettingsStore((state) => state.allowLocalResourceLaunch);
  const setDefaultNewBoxLayout = useSettingsStore((state) => state.setDefaultNewBoxLayout);
  const setAllowLocalResourceLaunch = useSettingsStore((state) => state.setAllowLocalResourceLaunch);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-6 px-6 py-12">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">KhaosBox</p>
          <h1 className="text-4xl font-semibold tracking-tight">Extension Options</h1>
          <p className="max-w-2xl text-base text-white/60">
            Extension-level defaults live here. Workspace editing still happens on the new tab page.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-white">Workspace defaults</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDefaultNewBoxLayout('list')}
                className={`rounded-2xl border p-4 text-left text-sm transition-colors ${
                  defaultNewBoxLayout === 'list'
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                New boxes open in list view
              </button>
              <button
                onClick={() => setDefaultNewBoxLayout('grid')}
                className={`rounded-2xl border p-4 text-left text-sm transition-colors ${
                  defaultNewBoxLayout === 'grid'
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                New boxes open in grid view
              </button>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <span>Allow local resource launch actions</span>
              <input
                type="checkbox"
                checked={allowLocalResourceLaunch}
                onChange={(event) => setAllowLocalResourceLaunch(event.target.checked)}
                className="h-4 w-4 accent-white"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="./newtab.html"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              Open new tab preview
            </a>
            <a
              href="https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              Edge extension docs
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
