import { Button, Modal, message, Popconfirm, Space, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n';
import {
  deleteUploadRecords,
  getUploadCapabilities,
  listUploadRecords,
  type UploadRecord,
  uploadManagedFile,
} from '../../services/fileManagerService';
import {
  decodeTextPreview,
  FilePreviewError,
  fetchPreviewBuffer,
  getPreviewKind,
  MAX_STRUCTURED_PREVIEW_BYTES,
  MAX_TEXT_PREVIEW_BYTES,
  type PreviewKind,
  parseStructuredPreview,
  type StructuredPreview,
} from './filePreview';
import * as styles from './index.module.css';

const DEFAULT_MAX_FILE_BYTES = 4 * 1024 * 1024;

const bufferedPreviewAddress = (record: UploadRecord) => record.previewUrl || record.signedUrl || record.url;
const DIRECT_PREVIEW_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4']);
const mediaPreviewAddress = (record: UploadRecord) => {
  const extension = record.filename.toLowerCase().split('.').pop() || '';
  return DIRECT_PREVIEW_EXTENSIONS.has(extension) ? record.url : bufferedPreviewAddress(record);
};

type StructuredPreviewKind = Extract<PreviewKind, 'word' | 'spreadsheet' | 'presentation' | 'archive'>;

const isStructuredPreviewKind = (kind: PreviewKind): kind is StructuredPreviewKind =>
  ['word', 'spreadsheet', 'presentation', 'archive'].includes(kind);

type QueueItem = {
  key: string;
  file: File;
  status: 'waiting' | 'uploading' | 'success' | 'failed';
  result?: string;
};

export default function FileManager() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<UploadRecord>();
  const [previewText, setPreviewText] = useState('');
  const [structuredPreview, setStructuredPreview] = useState<StructuredPreview>();
  const [activeSheet, setActiveSheet] = useState(0);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [maxUploadBytes, setMaxUploadBytes] = useState(DEFAULT_MAX_FILE_BYTES);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, capabilities] = await Promise.all([listUploadRecords(), getUploadCapabilities()]);
      setRecords(rows);
      setMaxUploadBytes(capabilities.maxUploadBytes);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('fileManager.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPreviewText('');
    setStructuredPreview(undefined);
    setActiveSheet(0);
    setPreviewError('');
    setPreviewLoading(false);
    if (!previewRecord) return;

    const kind = getPreviewKind(previewRecord);
    if (kind !== 'text' && !isStructuredPreviewKind(kind)) return;

    const controller = new AbortController();
    const loadFilePreview = async () => {
      setPreviewLoading(true);
      try {
        const buffer = await fetchPreviewBuffer(
          bufferedPreviewAddress(previewRecord),
          kind === 'text' ? MAX_TEXT_PREVIEW_BYTES : MAX_STRUCTURED_PREVIEW_BYTES,
          controller.signal,
        );
        if (kind === 'text') {
          setPreviewText(decodeTextPreview(buffer));
        } else {
          setStructuredPreview(await parseStructuredPreview(buffer, kind, previewRecord.filename));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          if (error instanceof FilePreviewError) {
            if (error.code === 'http') {
              setPreviewError(t('fileManager.previewReadFailedStatus', { status: error.status ?? '' }));
            } else if (error.code === 'no-body') {
              setPreviewError(t('fileManager.previewNoBody'));
            } else if (error.code === 'too-large') {
              setPreviewError(
                t(kind === 'text' ? 'fileManager.previewTooLarge' : 'fileManager.previewStructuredTooLarge'),
              );
            } else if (error.code === 'too-many-entries') {
              setPreviewError(t('fileManager.previewTooManyEntries'));
            } else if (error.code === 'expanded-too-large') {
              setPreviewError(t('fileManager.previewExpandedTooLarge'));
            } else {
              setPreviewError(t('fileManager.previewInvalidFile'));
            }
          } else {
            setPreviewError(error instanceof Error ? error.message : t('fileManager.previewFailed'));
          }
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    };

    loadFilePreview();
    return () => controller.abort();
  }, [previewRecord, t]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    const valid: QueueItem[] = [];
    files.forEach((file, index) => {
      if (file.size > maxUploadBytes) {
        message.error(t('fileManager.fileTooLarge', { name: file.name, maxUploadBytes }));
        return;
      }
      valid.push({
        key: `${Date.now()}-${index}-${file.name}`,
        file,
        status: 'waiting',
      });
    });
    if (!valid.length) return;

    setQueue(valid);
    setUploading(true);
    let successCount = 0;
    for (const item of valid) {
      setQueue((current) =>
        current.map((queued) => (queued.key === item.key ? { ...queued, status: 'uploading' } : queued)),
      );
      try {
        const record = await uploadManagedFile(item.file);
        successCount += 1;
        setQueue((current) =>
          current.map((queued) =>
            queued.key === item.key ? { ...queued, status: 'success', result: record.url } : queued,
          ),
        );
      } catch (error) {
        setQueue((current) =>
          current.map((queued) =>
            queued.key === item.key
              ? {
                  ...queued,
                  status: 'failed',
                  result: error instanceof Error ? error.message : t('fileManager.uploadFailed'),
                }
              : queued,
          ),
        );
      }
    }
    setUploading(false);
    if (successCount) {
      message.success(t('fileManager.uploadSucceeded', { count: successCount }));
      await load();
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeSelected = async () => {
    const ids = selectedIds.map(Number).filter(Number.isInteger);
    if (!ids.length) return;
    try {
      await deleteUploadRecords(ids);
      setSelectedIds([]);
      await load();
      message.success(t('fileManager.deleteSucceeded'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('fileManager.deleteFailed'));
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success(t('fileManager.copySucceeded'));
    } catch {
      message.error(t('fileManager.copyFailed'));
    }
  };

  const columns: ColumnsType<UploadRecord> = useMemo(
    () => [
      {
        title: t('fileManager.file'),
        dataIndex: 'filename',
        key: 'filename',
        render: (filename: string, record) => (
          <div className={styles.fileCell}>
            {record.mimeType?.startsWith('image/') ? (
              <img src={mediaPreviewAddress(record)} alt="" loading="lazy" />
            ) : (
              <span className={styles.fileIcon}>FILE</span>
            )}
            <span>{filename}</span>
          </div>
        ),
      },
      { title: 'mimeType', dataIndex: 'mimeType', key: 'mimeType', width: 180 },
      { title: 'size', dataIndex: 'size', key: 'size', width: 120 },
      { title: 'uploader', dataIndex: 'uploader', key: 'uploader', width: 140 },
      { title: 'createdAt', dataIndex: 'createdAt', key: 'createdAt', width: 190 },
      {
        title: t('fileManager.address'),
        dataIndex: 'url',
        key: 'url',
        width: 180,
        render: (url: string, record) => (
          <Space>
            <button className={styles.linkButton} type="button" onClick={() => setPreviewRecord(record)}>
              {t('fileManager.preview')}
            </button>
            <a href={record.signedUrl || url} target="_blank" rel="noopener noreferrer">
              {t('fileManager.open')}
            </a>
            <button className={styles.linkButton} type="button" onClick={() => copy(url)}>
              {t('fileManager.copy')}
            </button>
          </Space>
        ),
      },
    ],
    [t],
  );

  const currentPreviewKind = previewRecord ? getPreviewKind(previewRecord) : 'unsupported';
  const currentPreviewUrl = previewRecord ? mediaPreviewAddress(previewRecord) : '';
  const activeSpreadsheetSheet =
    structuredPreview?.kind === 'spreadsheet' ? structuredPreview.sheets[activeSheet] : undefined;

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">{t('fileManager.eyebrow')}</p>
          <h1>{t('fileManager.title')}</h1>
          <p className="workspace-page__description">{t('fileManager.description')}</p>
        </div>
        <div className="workspace-page__actions">
          <Button onClick={load} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Popconfirm
            title={t('fileManager.deleteConfirm', { count: selectedIds.length })}
            description={t('fileManager.deleteDescription')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={removeSelected}
            disabled={!selectedIds.length}
          >
            <Button danger disabled={!selectedIds.length}>
              {t('fileManager.deleteSelected')}
            </Button>
          </Popconfirm>
        </div>
      </header>

      <section className="workspace-panel">
        <button
          type="button"
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            uploadFiles(Array.from(event.dataTransfer.files));
          }}
          disabled={uploading}
        >
          <strong>{uploading ? t('fileManager.uploading') : t('fileManager.dropzone')}</strong>
          <span>{t('fileManager.dropzoneHint', { maxUploadBytes })}</span>
        </button>
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          multiple
          onChange={(event) => uploadFiles(Array.from(event.target.files || []))}
        />

        {queue.length > 0 && (
          <div className={styles.queue} aria-live="polite">
            {queue.map((item) => (
              <div key={item.key}>
                <span>{item.file.name}</span>
                <code>{item.file.size}</code>
                <strong data-status={item.status}>{t(`fileManager.status.${item.status}`)}</strong>
                <small>{item.result}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="workspace-panel workspace-panel--flush">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={records}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds,
          }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 1100 }}
          locale={{
            emptyText: loading ? t('fileManager.loadingRecords') : t('fileManager.empty'),
          }}
        />
      </section>

      <Modal
        open={Boolean(previewRecord)}
        title={previewRecord?.filename}
        width="min(960px, calc(100vw - 32px))"
        centered
        onCancel={() => setPreviewRecord(undefined)}
        footer={
          previewRecord
            ? [
                <Button key="open" href={previewRecord.signedUrl || previewRecord.url} target="_blank">
                  {t('fileManager.openOriginal')}
                </Button>,
                <Button key="close" type="primary" onClick={() => setPreviewRecord(undefined)}>
                  {t('common.close')}
                </Button>,
              ]
            : null
        }
      >
        <div className={styles.previewBody}>
          {currentPreviewKind === 'image' && <img src={currentPreviewUrl} alt={previewRecord?.filename || ''} />}
          {currentPreviewKind === 'video' && (
            <video src={currentPreviewUrl} controls preload="metadata">
              <track kind="captions" />
            </video>
          )}
          {currentPreviewKind === 'audio' && (
            <audio src={currentPreviewUrl} controls preload="metadata">
              <track kind="captions" />
            </audio>
          )}
          {currentPreviewKind === 'pdf' && (
            <iframe src={currentPreviewUrl} title={previewRecord?.filename || 'PDF 预览'} />
          )}
          {(currentPreviewKind === 'text' || isStructuredPreviewKind(currentPreviewKind)) &&
            (previewLoading ? (
              <Spin tip={t('fileManager.loadingFile')}>
                <div className={styles.previewLoading} />
              </Spin>
            ) : previewError ? (
              <div className={styles.previewMessage}>{previewError}</div>
            ) : currentPreviewKind === 'text' ? (
              <pre>{previewText}</pre>
            ) : structuredPreview?.kind === 'word' ? (
              <div className={styles.documentPreview}>
                <pre>{structuredPreview.text}</pre>
                {structuredPreview.warnings.length > 0 && (
                  <details>
                    <summary>{t('fileManager.previewWarnings', { count: structuredPreview.warnings.length })}</summary>
                    {structuredPreview.warnings.map((warning, index) => (
                      <code key={`${index}-${warning}`}>{warning}</code>
                    ))}
                  </details>
                )}
              </div>
            ) : structuredPreview?.kind === 'spreadsheet' ? (
              <div className={styles.spreadsheetPreview}>
                <div className={styles.sheetTabs} role="tablist" aria-label={t('fileManager.previewSheets')}>
                  {structuredPreview.sheets.map((sheet, index) => (
                    <button
                      key={`${index}-${sheet.name}`}
                      type="button"
                      role="tab"
                      aria-selected={index === activeSheet}
                      onClick={() => setActiveSheet(index)}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
                {structuredPreview.truncated && (
                  <p className={styles.previewNotice}>{t('fileManager.previewTruncated')}</p>
                )}
                {activeSpreadsheetSheet ? (
                  <div className={styles.sheetTableWrap}>
                    <table>
                      <tbody>
                        {activeSpreadsheetSheet.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            <th>{rowIndex + 1}</th>
                            {row.map((cell, columnIndex) => (
                              <td key={columnIndex}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.previewMessage}>{t('fileManager.previewEmpty')}</div>
                )}
              </div>
            ) : structuredPreview?.kind === 'presentation' ? (
              <div className={styles.presentationPreview}>
                {structuredPreview.slides.length ? (
                  structuredPreview.slides.map((slide) => (
                    <section key={slide.number}>
                      <strong>{t('fileManager.previewSlide', { number: slide.number })}</strong>
                      <pre>{slide.text}</pre>
                    </section>
                  ))
                ) : (
                  <div className={styles.previewMessage}>{t('fileManager.previewEmpty')}</div>
                )}
              </div>
            ) : structuredPreview?.kind === 'archive' ? (
              <div className={styles.archivePreview}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('fileManager.previewArchiveName')}</th>
                      <th>{t('fileManager.previewArchiveSize')}</th>
                      <th>{t('fileManager.previewArchiveCompressedSize')}</th>
                      <th>{t('fileManager.previewArchiveDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structuredPreview.entries.map((entry, index) => (
                      <tr key={`${index}-${entry.name}`}>
                        <td>{entry.name}</td>
                        <td>{entry.size}</td>
                        <td>{entry.compressedSize}</td>
                        <td>{entry.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.previewMessage}>{t('fileManager.previewEmpty')}</div>
            ))}
          {currentPreviewKind === 'unsupported' && (
            <div className={styles.previewMessage}>
              <strong>{t('fileManager.previewUnsupported')}</strong>
              <span>{t('fileManager.previewUnsupportedHint')}</span>
              <code>{previewRecord?.mimeType || 'application/octet-stream'}</code>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
