export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  pos: number;
}

export interface SnapPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  guides: SnapGuide[];
}
