import { Palette } from 'lucide-react';
import { cn } from '../../lib/utils';

const THEMES = [
  { id: 'dark', class: 'bg-zinc-900/90 border-zinc-700', preview: 'bg-zinc-800' },
  { id: 'blue', class: 'bg-blue-950/90 border-blue-800', preview: 'bg-blue-800' },
  { id: 'emerald', class: 'bg-emerald-950/90 border-emerald-800', preview: 'bg-emerald-800' },
  { id: 'rose', class: 'bg-rose-950/90 border-rose-800', preview: 'bg-rose-800' },
  { id: 'amber', class: 'bg-amber-950/90 border-amber-800', preview: 'bg-amber-800' },
  { id: 'purple', class: 'bg-purple-950/90 border-purple-800', preview: 'bg-purple-800' },
  { id: 'cyan', class: 'bg-cyan-950/90 border-cyan-800', preview: 'bg-cyan-800' },
  { id: 'fuchsia', class: 'bg-fuchsia-950/90 border-fuchsia-800', preview: 'bg-fuchsia-800' },
  {
    id: 'grad-dark',
    class: 'bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 border-zinc-700',
    preview: 'bg-gradient-to-br from-zinc-700 to-zinc-600',
  },
  {
    id: 'grad-cosmic',
    class: 'bg-gradient-to-br from-indigo-950/95 to-purple-900/95 border-indigo-800',
    preview: 'bg-gradient-to-br from-indigo-800 to-purple-700',
  },
  {
    id: 'grad-sunset',
    class: 'bg-gradient-to-br from-orange-950/95 to-red-900/95 border-orange-800',
    preview: 'bg-gradient-to-br from-orange-700 to-red-700',
  },
  {
    id: 'grad-ocean',
    class: 'bg-gradient-to-br from-cyan-950/95 to-blue-900/95 border-cyan-800',
    preview: 'bg-gradient-to-br from-cyan-700 to-blue-700',
  },
];

interface Props {
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  onUpdate: (theme: string) => void;
}

export default function BoxThemePicker({ showThemePicker, setShowThemePicker, onUpdate }: Props) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowThemePicker(!showThemePicker)}
        className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        title="Theme"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Palette size={14} />
      </button>
      {showThemePicker && (
        <div
          className="absolute right-0 top-full z-50 mt-1 grid w-40 grid-cols-4 gap-2 rounded-xl border border-zinc-700 bg-zinc-800/95 p-2 shadow-2xl backdrop-blur-xl"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onUpdate(theme.class);
                setShowThemePicker(false);
              }}
              className={cn(
                'h-6 w-6 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110',
                theme.preview,
              )}
              title={theme.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
