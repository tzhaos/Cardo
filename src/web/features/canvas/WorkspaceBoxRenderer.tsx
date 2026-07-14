import { memo } from 'react';
import type { WorkspaceBox } from '../../domain/workspace';
import { UniversalBox } from '../boxes/UniversalBox';

export const WorkspaceBoxRenderer = memo(function WorkspaceBoxRenderer({
  box,
}: {
  box: WorkspaceBox;
}) {
  return <UniversalBox box={box} />;
});
