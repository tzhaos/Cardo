import { memo } from 'react';
import type { WorkspaceBox } from '../../domain/workspace';
import { BookmarkBox } from '../boxes/BookmarkBox';
import { ClipboardBox } from '../boxes/ClipboardBox';
import { FolderBox } from '../boxes/FolderBox';

export const WorkspaceBoxRenderer = memo(function WorkspaceBoxRenderer({
  box,
  skipEntryAnimation,
}: {
  box: WorkspaceBox;
  skipEntryAnimation: boolean;
}) {
  switch (box.type) {
    case 'folder':
      return <FolderBox box={box} skipEntryAnimation={skipEntryAnimation} />;
    case 'bookmark':
      return <BookmarkBox box={box} skipEntryAnimation={skipEntryAnimation} />;
    case 'clipboard':
      return <ClipboardBox box={box} skipEntryAnimation={skipEntryAnimation} />;
  }
});
