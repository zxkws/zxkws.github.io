import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { v4 as uuid } from 'uuid';

import styles from './PdfEditor.module.css';
import PageCanvas from './components/PageCanvas';
import type { Annotation, EditorTool, PageMetrics, HighlightAnnotation, TextAnnotation } from './types';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type PdfEditorAppProps = {
  basename?: string;
};

const TOOL_LABEL_MAP: Record<EditorTool, string> = {
  select: '选择',
  text: '文本批注',
  highlight: '高亮',
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const bytesToSize = (bytes: number) => {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const readCssVariable = (name: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const hexToRgb = (hex: string) => {
  const trimmed = hex.replace('#', '');
  if (trimmed.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return { r, g, b };
};

const PdfEditorApp = (_props: PdfEditorAppProps) => {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<EditorTool>('select');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    return () => {
      pdfDocument?.destroy();
    };
  }, [pdfDocument]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('请选择一个 PDF 文件');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const loadingTask = getDocument({
        data: bytes,
        useWorkerFetch: false,
      });
      const nextDocument = await loadingTask.promise;

      pdfDocument?.destroy();
      setPdfDocument(nextDocument);
      setPdfBytes(bytes);
      setFileName(file.name);
      setFileSize(file.size);
      setAnnotations([]);
      setSelectedAnnotationId(null);
      setZoom(100);

      const totalPages = nextDocument.numPages;
      const metrics: PageMetrics[] = [];
      for (let index = 1; index <= totalPages; index += 1) {
        const page = await nextDocument.getPage(index);
        const viewport = page.getViewport({ scale: 1 });
        metrics.push({ pageNumber: index, width: viewport.width, height: viewport.height });
      }
      setPageMetrics(metrics);
    } catch (err) {
      console.error('[pdf-editor-app] Failed to load pdf', err);
      setError(err instanceof Error ? err.message : 'PDF 加载失败');
      setPdfDocument(null);
      setPdfBytes(null);
      setPageMetrics([]);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const addTextAnnotation = useCallback((pageIndex: number, x: number, y: number) => {
    const annotation: TextAnnotation = {
      id: uuid(),
      type: 'text',
      pageIndex,
      x,
      y,
      text: '新的批注',
      fontSize: 16,
      color: readCssVariable('--pe-annotation-text', '#1f2937'),
    };
    setAnnotations((prev) => [...prev, annotation]);
    setSelectedAnnotationId(annotation.id);
    setTool('select');
  }, []);

  const addHighlightAnnotation = useCallback(
    (pageIndex: number, x: number, y: number, width: number, height: number) => {
      const annotation: HighlightAnnotation = {
        id: uuid(),
        type: 'highlight',
        pageIndex,
        x,
        y,
        width,
        height,
        color: readCssVariable('--pe-highlight-color', '#fde68a'),
        opacity: 0.45,
      };
      setAnnotations((prev) => [...prev, annotation]);
      setSelectedAnnotationId(annotation.id);
      setTool('select');
    },
    [],
  );

  const updateAnnotation = useCallback((id: string, updater: (annotation: Annotation) => Annotation) => {
    setAnnotations((prev) => prev.map((annotation) => (annotation.id === id ? updater(annotation) : annotation)));
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
    setSelectedAnnotationId((current) => (current === id ? null : current));
  }, []);

  const onDownload = useCallback(async () => {
    if (!pdfBytes) {
      setError('请先上传并编辑一个 PDF 文件');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      annotations.forEach((annotation) => {
        const page = pdfDoc.getPage(annotation.pageIndex);
        const { width, height } = page.getSize();

        if (annotation.type === 'text') {
          const textAnnotation = annotation as TextAnnotation;
          const { r, g, b } = hexToRgb(textAnnotation.color);
          const textHeight = textAnnotation.fontSize;
          const x = textAnnotation.x * width;
          const y = height - textAnnotation.y * height - textHeight;
          page.drawText(textAnnotation.text || '', {
            x,
            y,
            font,
            size: textAnnotation.fontSize,
            color: rgb(r / 255, g / 255, b / 255),
          });
        } else {
          const highlight = annotation as HighlightAnnotation;
          const { r, g, b } = hexToRgb(highlight.color);
          const rectWidth = highlight.width * width;
          const rectHeight = highlight.height * height;
          const x = highlight.x * width;
          const y = height - highlight.y * height - rectHeight;
          page.drawRectangle({
            x,
            y,
            width: rectWidth,
            height: rectHeight,
            color: rgb(r / 255, g / 255, b / 255),
            opacity: highlight.opacity,
          });
        }
      });

      const saved = await pdfDoc.save();
      const blob = new Blob([saved], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName ? fileName.replace(/\.pdf$/i, '') + '-edited.pdf' : 'pdf-editor-output.pdf';
      document.body.appendChild(link);
      link.click();
      requestAnimationFrame(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('[pdf-editor-app] Export failed', err);
      setError(err instanceof Error ? err.message : '导出失败，请重试');
    } finally {
      setDownloading(false);
    }
  }, [annotations, fileName, pdfBytes]);

  const handleZoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(event.target.value));
  };

  const handleToolClick = (nextTool: EditorTool) => {
    setTool(nextTool);
  };

  const renderSidebar = () => (
    <aside className={styles.sidebar}>
      <div>
        <label className={styles.fileInputLabel}>
          选择 PDF
          <input type="file" accept="application/pdf" onChange={handleFileChange} className={styles.hiddenInput} />
        </label>
        {fileName && (
          <div className={styles.fileMeta}>{`${fileName}${fileSize ? ` · ${bytesToSize(fileSize)}` : ''}`}</div>
        )}
      </div>

      <div>
        <div className={styles.sectionTitle}>工具</div>
        <div className={styles.toolbar}>
          {(['select', 'text', 'highlight'] as EditorTool[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.toolButton} ${tool === item ? styles.toolButtonActive : ''}`}
              onClick={() => handleToolClick(item)}
            >
              {TOOL_LABEL_MAP[item]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionTitle}>缩放</div>
        <div className={styles.zoomControl}>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoom}
            onChange={handleZoomChange}
            className={styles.zoomInput}
          />
          <span>{zoom}%</span>
        </div>
      </div>

      <button type="button" className={styles.downloadButton} onClick={onDownload} disabled={!pdfBytes || downloading}>
        {downloading ? '导出中…' : '下载已编辑 PDF'}
      </button>

      <div>
        <div className={styles.sectionTitle}>批注列表</div>
        {annotations.length === 0 ? (
          <div className={styles.hint}>在画布中选择文本或区域即可添加批注。</div>
        ) : (
          <div className={styles.annotationList}>
            {annotations.map((annotation) => {
              const pageLabel = `第 ${annotation.pageIndex + 1} 页`;
              const isSelected = selectedAnnotationId === annotation.id;
              return (
                <div
                  key={annotation.id}
                  className={`${styles.annotationCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => setSelectedAnnotationId(annotation.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.annotationHeader}>
                    <span>
                      {annotation.type === 'text' ? '文本批注' : '高亮区域'}
                      <span className={styles.badge}>{pageLabel}</span>
                    </span>
                    <div className={styles.annotationActions}>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteAnnotation(annotation.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div
                    className={styles.annotationMeta}
                  >{`位置：(${(annotation.x * 100).toFixed(1)}%, ${(annotation.y * 100).toFixed(1)}%)`}</div>

                  {annotation.type === 'text' ? (
                    <>
                      <label className={styles.controlLabel}>
                        文本内容
                        <textarea
                          className={styles.textInput}
                          rows={3}
                          value={(annotation as TextAnnotation).text}
                          onChange={(event) =>
                            updateAnnotation(annotation.id, (prev) =>
                              prev.type !== 'text'
                                ? prev
                                : {
                                    ...prev,
                                    text: event.target.value,
                                  },
                            )
                          }
                        />
                      </label>
                      <div className={styles.controlsRow}>
                        <label className={styles.controlLabel}>
                          文字大小
                          <input
                            type="number"
                            min={8}
                            max={96}
                            className={styles.numberInput}
                            value={(annotation as TextAnnotation).fontSize}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'text'
                                  ? prev
                                  : {
                                      ...prev,
                                      fontSize: clamp(Number(event.target.value) || 12, 8, 96),
                                    },
                              )
                            }
                          />
                        </label>
                        <label className={styles.controlLabel}>
                          文字颜色
                          <input
                            type="color"
                            className={styles.colorInput}
                            value={(annotation as TextAnnotation).color}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'text'
                                  ? prev
                                  : {
                                      ...prev,
                                      color: event.target.value,
                                    },
                              )
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.controlsRow}>
                        <label className={styles.controlLabel}>
                          区域宽度
                          <input
                            type="number"
                            min={0.02}
                            max={1}
                            step={0.01}
                            className={styles.numberInput}
                            value={(annotation as HighlightAnnotation).width.toFixed(2)}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'highlight'
                                  ? prev
                                  : {
                                      ...prev,
                                      width: clamp(Number(event.target.value) || prev.width, 0.02, 1),
                                    },
                              )
                            }
                          />
                        </label>
                        <label className={styles.controlLabel}>
                          区域高度
                          <input
                            type="number"
                            min={0.02}
                            max={1}
                            step={0.01}
                            className={styles.numberInput}
                            value={(annotation as HighlightAnnotation).height.toFixed(2)}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'highlight'
                                  ? prev
                                  : {
                                      ...prev,
                                      height: clamp(Number(event.target.value) || prev.height, 0.02, 1),
                                    },
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className={styles.controlsRow}>
                        <label className={styles.controlLabel}>
                          高亮颜色
                          <input
                            type="color"
                            className={styles.colorInput}
                            value={(annotation as HighlightAnnotation).color}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'highlight'
                                  ? prev
                                  : {
                                      ...prev,
                                      color: event.target.value,
                                    },
                              )
                            }
                          />
                        </label>
                        <label className={styles.controlLabel}>
                          不透明度
                          <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={(annotation as HighlightAnnotation).opacity}
                            onChange={(event) =>
                              updateAnnotation(annotation.id, (prev) =>
                                prev.type !== 'highlight'
                                  ? prev
                                  : {
                                      ...prev,
                                      opacity: clamp(Number(event.target.value) || prev.opacity, 0.1, 1),
                                    },
                              )
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <div className={styles.errorNotice}>{error}</div>}
    </aside>
  );

  const renderViewer = () => {
    if (!pdfDocument || pageMetrics.length === 0) {
      return (
        <div className={styles.viewerPanel}>
          <div className={styles.emptyState}>
            <strong>上传一个 PDF 文件即可开始编辑</strong>
            <div className={styles.hint}>支持文本批注和高亮区域，导出后即可下载离线保存。</div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.viewerPanel}>
        {pageMetrics.map((metrics) => (
          <PageCanvas
            key={metrics.pageNumber}
            pdfDocument={pdfDocument}
            metrics={metrics}
            zoom={zoom}
            annotations={annotations}
            tool={tool}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
            onRequestAddText={addTextAnnotation}
            onRequestAddHighlight={addHighlightAnnotation}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pdfEditorShell}>
        {renderViewer()}
        {renderSidebar()}
      </div>
      {loading && (
        <div className={styles.badge} style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem' }}>
          正在加载 PDF…
        </div>
      )}
    </div>
  );
};

export default PdfEditorApp;
