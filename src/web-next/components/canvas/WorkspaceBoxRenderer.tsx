import type { WorkspaceBox } from '../../domain/workspace';
import { BookmarkBox } from '../boxes/BookmarkBox';
import { ClipboardBox } from '../boxes/ClipboardBox';
import { FolderBox } from '../boxes/FolderBox';

export function WorkspaceBoxRenderer({ box }: { box: WorkspaceBox }) {
  switch (box.type) {
    case 'folder':
      return <FolderBox box={box} />;
    case 'bookmark':
      return <BookmarkBox box={box} />;
    case 'clipboard':
      return <ClipboardBox box={box} />;
  }
}
