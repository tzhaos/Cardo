import { memo } from 'react';
import type { WorkspaceBox } from '../../domain/workspace';
import { UniversalBox } from '../boxes/UniversalBox';

export const WorkspaceBoxRenderer = memo(function WorkspaceBoxRenderer({
  box,
  skipEntryAnimation,
  layoutLocked = false,
}: {
  box: WorkspaceBox;
  skipEntryAnimation: boolean;
  /** When true (waterfall/list), free drag/resize is disabled. */
  layoutLocked?: boolean;
}) {
  return (
    <UniversalBox box={box} skipEntryAnimation={skipEntryAnimation} layoutLocked={layoutLocked} />
  );
});
