import { memo } from 'react';
import type { WorkspaceBox } from '../../domain/workspace';
import { UniversalBox } from '../boxes/UniversalBox';

export const WorkspaceBoxRenderer = memo(function WorkspaceBoxRenderer({
  box,
  skipEntryAnimation,
}: {
  box: WorkspaceBox;
  skipEntryAnimation: boolean;
}) {
  return <UniversalBox box={box} skipEntryAnimation={skipEntryAnimation} />;
});
