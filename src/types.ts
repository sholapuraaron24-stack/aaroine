export interface ImagePreset {
  id: string;
  name: string;
  url: string;
  removedUrl?: string;
  description: string;
  category: 'Animal' | 'Product' | 'Portrait';
  defaultChroma?: {
    color: [number, number, number]; // [R, G, B] of background
    threshold: number;
    feather: number;
  };
}

export interface Feedback {
  id: string;
  author: string;
  rating: number;
  comment: string;
  tags: string[];
  createdTime: string;
}

export interface WorkspaceState {
  tool: 'auto' | 'brush-erase' | 'brush-restore';
  brushSize: number;
  threshold: number;
  feather: number;
  backdrop: 'grid' | 'grid-dark' | 'solid' | 'gradient' | 'custom';
  backdropColor: string;
  backdropGradient: string;
  customBackdropUrl?: string;
  zoom: number;
  isProcessing: boolean;
  disablePostProcessing?: boolean;
}
