export type EditorTool = 'select' | 'text' | 'highlight';

export type BaseAnnotation = {
  id: string;
  pageIndex: number; // zero-based index
  x: number; // normalized 0-1 (left)
  y: number; // normalized 0-1 (top)
};

export type TextAnnotation = BaseAnnotation & {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
};

export type HighlightAnnotation = BaseAnnotation & {
  type: 'highlight';
  width: number;
  height: number;
  color: string;
  opacity: number;
};

export type Annotation = TextAnnotation | HighlightAnnotation;

export type PageMetrics = {
  pageNumber: number; // 1-based page index from pdf.js
  width: number;
  height: number;
};
