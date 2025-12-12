import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/pdf';
import clsx from 'clsx';

import styles from '../PdfEditor.module.css';
import type { Annotation, EditorTool, PageMetrics, HighlightAnnotation, TextAnnotation } from '../types';

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

type PageCanvasProps = {
  pdfDocument: PDFDocumentProxy | null;
  metrics: PageMetrics;
  zoom: number;
  annotations: Annotation[];
  tool: EditorTool;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onRequestAddText: (pageIndex: number, x: number, y: number) => void;
  onRequestAddHighlight: (pageIndex: number, x: number, y: number, width: number, height: number) => void;
};

type DragRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_DRAG_DISTANCE = 0.01;

const PageCanvas = ({
  pdfDocument,
  metrics,
  zoom,
  annotations,
  tool,
  selectedAnnotationId,
  onSelectAnnotation,
  onRequestAddText,
  onRequestAddHighlight,
}: PageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragRect, setDragRect] = useState<DragRect | null>(null);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    let renderTask: import('pdfjs-dist/types/src/display/api').RenderTask | null = null;
    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(metrics.pageNumber);
        if (cancelled) {
          return;
        }
        const scale = Math.max(zoom, 10) / 100;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (error) {
        console.error('[pdf-editor-app] Failed to render page', error);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDocument, metrics.pageNumber, zoom]);

  useEffect(() => {
    dragStartRef.current = null;
    setDragRect(null);
  }, [tool]);

  const pageAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.pageIndex === metrics.pageNumber - 1),
    [annotations, metrics.pageNumber],
  );

  const getNormalizedPoint = (event: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return null;
    }
    const rect = overlay.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);
    return { x, y };
  };

  const handleOverlayClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (tool === 'select') {
      onSelectAnnotation(null);
      return;
    }
    if (tool !== 'text') {
      return;
    }
    const point = getNormalizedPoint(event.nativeEvent);
    if (!point) {
      return;
    }
    onRequestAddText(metrics.pageNumber - 1, point.x, point.y);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (tool !== 'highlight') {
      return;
    }
    const point = getNormalizedPoint(event);
    if (!point) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = point;
    setDragRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragStartRef.current || tool !== 'highlight') {
      return;
    }
    const current = getNormalizedPoint(event);
    if (!current) {
      return;
    }
    const start = dragStartRef.current;
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    setDragRect({ x, y, width, height });
  };

  const finalizeHighlight = (event: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || tool !== 'highlight') {
      return;
    }
    const current = getNormalizedPoint(event) ?? dragStartRef.current;
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragRect(null);
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    if (width < MIN_DRAG_DISTANCE || height < MIN_DRAG_DISTANCE) {
      return;
    }
    onRequestAddHighlight(metrics.pageNumber - 1, x, y, width, height);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (tool !== 'highlight') {
      return;
    }
    finalizeHighlight(event);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerCancel: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (tool !== 'highlight') {
      return;
    }
    dragStartRef.current = null;
    setDragRect(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleAnnotationClick = (annotationId: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectAnnotation(annotationId);
  };

  return (
    <div className={styles.pageWrapper} data-page={`${metrics.pageNumber}`}>
      <canvas ref={canvasRef} className={styles.pdfCanvas} />
      <div
        ref={overlayRef}
        className={styles.overlay}
        onClick={handleOverlayClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="presentation"
      >
        {pageAnnotations.map((annotation) => {
          if (annotation.type === 'text') {
            const { fontSize, color, text } = annotation as TextAnnotation;
            const effectiveFont = Math.max(fontSize * (zoom / 100), 8);
            return (
              <div
                key={annotation.id}
                onClick={handleAnnotationClick(annotation.id)}
                className={clsx(styles.textAnnotation, selectedAnnotationId === annotation.id && styles.selected)}
                style={{
                  left: `${annotation.x * 100}%`,
                  top: `${annotation.y * 100}%`,
                  color,
                  fontSize: `${effectiveFont}px`,
                }}
              >
                {text || '空文本'}
              </div>
            );
          }
          const { color, opacity, width, height } = annotation as HighlightAnnotation;
          return (
            <div
              key={annotation.id}
              onClick={handleAnnotationClick(annotation.id)}
              className={clsx(styles.highlightAnnotation, selectedAnnotationId === annotation.id && styles.selected)}
              style={{
                left: `${annotation.x * 100}%`,
                top: `${annotation.y * 100}%`,
                width: `${width * 100}%`,
                height: `${height * 100}%`,
                backgroundColor: color,
                opacity,
              }}
            />
          );
        })}
        {dragRect && (
          <div
            className={styles.dragPreview}
            style={{
              left: `${dragRect.x * 100}%`,
              top: `${dragRect.y * 100}%`,
              width: `${dragRect.width * 100}%`,
              height: `${dragRect.height * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default memo(PageCanvas);
