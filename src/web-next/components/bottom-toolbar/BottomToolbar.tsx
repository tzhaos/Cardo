import { useEffect, useRef, useState } from 'react';
import { Bookmark, Clipboard, Folder, Plus, Search, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useIndependentMenuStore } from '../../app/stores/independentMenuStore';
import type { WorkspaceBoxType } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { getViewportCenterFrame, useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton, IconFrame } from '../primitives/IconPrimitives';

export function BottomToolbar() {
  const createBox = useWorkspaceStore((state) => state.createBox);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const settingsOpen = useIndependentMenuStore((state) => state.menus.settings.open);
  const toggleIndependentMenu = useIndependentMenuStore((state) => state.toggleMenu);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (isSearchActive) {
      searchInputRef.current?.focus();
    }
  }, [isSearchActive]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: Event) => {
      const target = event.target as Node | null;
      if (target && shellRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer, true);
    window.addEventListener('contextmenu', closeOnOutsidePointer, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      window.removeEventListener('contextmenu', closeOnOutsidePointer, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const handleAdd = (type: WorkspaceBoxType) => {
    createBox(type, getViewportCenterFrame(type), getBoxTypeLabel(type, t));
    setIsMenuOpen(false);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
  };

  return (
    <div className="wbn-bottom-shell" ref={shellRef}>
      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            className="wbn-create-popover"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <MenuButton icon={Folder} label={t('box.folder')} onClick={() => handleAdd('folder')} />
            <MenuButton
              icon={Bookmark}
              label={t('box.bookmark')}
              onClick={() => handleAdd('bookmark')}
            />
            <MenuButton
              icon={Clipboard}
              label={t('box.clipboard')}
              onClick={() => handleAdd('clipboard')}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="wbn-bottom-toolbar" aria-label={t('toolbar.workspaceTools')}>
        <IconButton
          className={`wbn-toolbar-button${settingsOpen ? ' wbn-toolbar-button-active' : ''}`}
          aria-controls="wbn-settings-window"
          aria-expanded={settingsOpen}
          onClick={() => {
            setIsMenuOpen(false);
            toggleIndependentMenu('settings');
          }}
          title={t('toolbar.settings')}
          aria-label={t('toolbar.settings')}
        >
          <motion.span
            className="wbn-settings-trigger-icon wbn-icon-frame"
            animate={{ rotate: settingsOpen ? 120 : 0, scale: settingsOpen ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 330, damping: 22 }}
          >
            <Settings size={18} />
          </motion.span>
        </IconButton>
        <div className="wbn-toolbar-divider" />
        <motion.div className="wbn-search-pill" animate={{ width: isSearchActive ? 240 : 40 }}>
          <IconButton
            onClick={() => {
              setIsMenuOpen(false);
              setIsSearchActive((value) => !value);
            }}
            aria-label={t('toolbar.search')}
          >
            <Search size={18} />
          </IconButton>
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onBlur={() => {
              if (!searchQuery) {
                closeSearch();
              }
            }}
            placeholder={t('toolbar.searchPlaceholder')}
            style={{
              opacity: isSearchActive ? 1 : 0,
              pointerEvents: isSearchActive ? 'auto' : 'none',
            }}
          />
        </motion.div>
        <div className="wbn-toolbar-divider" />
        <IconButton
          className="wbn-toolbar-create"
          onClick={() => {
            setIsMenuOpen((value) => !value);
          }}
          aria-label={t('toolbar.newBox')}
          title={t('toolbar.newBox')}
        >
          <motion.span
            className="wbn-icon-frame"
            animate={{ rotate: isMenuOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Plus size={20} />
          </motion.span>
        </IconButton>
      </div>
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="wbn-create-menu-button" type="button" onClick={onClick}>
      <IconFrame>
        <Icon size={16} />
      </IconFrame>
      <span>{label}</span>
    </button>
  );
}

function getBoxTypeLabel(type: WorkspaceBoxType, t: ReturnType<typeof useI18n>['t']) {
  return type === 'folder'
    ? t('box.folder')
    : type === 'bookmark'
      ? t('box.bookmark')
      : t('box.clipboard');
}
