import type { ViewportCamera } from '../../../core/domains/layout/model/viewport';

interface BackgroundProps {
  camera: ViewportCamera;
}

export default function Background({ camera }: BackgroundProps) {
  return (
    <>
      <div
        className="kb-desktop-grid pointer-events-none fixed inset-0 z-0"
        style={{ backgroundPosition: `${camera.panX}px ${camera.panY}px` }}
      />
      <div className="kb-desktop-glow pointer-events-none fixed inset-0 z-0" />
    </>
  );
}
