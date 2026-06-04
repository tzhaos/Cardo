import { Plus } from 'lucide-react';
import { useI18n } from '../../../app/hooks/useI18n';

export default function DropZoneOverlay() {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-50 m-2 flex items-center justify-center rounded-lg border-2 border-dashed border-win-accent bg-win-bg-secondary pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-win-active px-4 py-2 text-sm font-medium text-win-text shadow-lg">
        <Plus size={16} />
        {t('dropZone.add')}
      </div>
    </div>
  );
}
