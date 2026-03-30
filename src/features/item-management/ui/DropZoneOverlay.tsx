import { Plus } from 'lucide-react';

export default function DropZoneOverlay() {
  return (
    <div className="absolute inset-0 z-50 m-2 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/5 backdrop-blur-[1px] pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-200 shadow-lg">
        <Plus size={16} />
        Drop to add
      </div>
    </div>
  );
}
