import { Button, Modal, message, Popconfirm, Space, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n';
import {
  deleteUploadRecords,
  listUploadRecords,
  type UploadRecord,
  uploadManagedFile,
} from '../../services/fileManagerService';
import * as styles from './index.module.css';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([
  'bat',
  'c',
  'conf',
  'cpp',
  'css',
  'csv',
  'env',
  'go',
  'graphql',
  'h',
  'html',
  'ini',
  'java',
  'js',
  'json',
  'jsx',
  'log',
  'md',
  'php',
  'properties',
  'py',
  'rb',
  'rs',
  'scss',
  'sh',
  'sql',
  'svg',
  'toml',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xml',
  'yaml',
  'yml',
]);

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported';

const extensionOf = (filename: string) => filename.split('.').pop()?.toLowerCase() || '';

const getPreviewKind = (record: UploadRecord): PreviewKind => {
  const mimeType = record.mimeType?.toLowerCase() || '';
  const extension = extensionOf(record.filename);
  if (mimeType.startsWith('image/') && mimeType !== 'image/svg+xml') return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (
    mimeType.startsWith('text/') ||
    ['application/json', 'application/ld+json', 'application/xml', 'application/yaml'].includes(mimeType) ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    return 'text';
  }
  return 'unsupported';
};

const previewAddress = (record: UploadRecord) => record.previewUrl || record.signedUrl || record.url;

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
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listUploadRecords());
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
    if (!previewRecord || getPreviewKind(previewRecord) !== 'text') {
      setPreviewText('');
      setPreviewError('');
      setPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadTextPreview = async () => {
      setPreviewText('');
      setPreviewError('');
      setPreviewLoading(true);
      try {
        const response = await fetch(previewAddress(previewRecord), {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(t('fileManager.previewReadFailedStatus', { status: response.status }));
        }

        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (declaredSize > MAX_TEXT_PREVIEW_BYTES) {
          throw new Error(t('fileManager.previewTooLarge'));
        }
        if (!response.body) throw new Error(t('fileManager.previewNoBody'));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = 0;
        let content = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > MAX_TEXT_PREVIEW_BYTES) {
            await reader.cancel();
            throw new Error(t('fileManager.previewTooLarge'));
          }
          content += decoder.decode(value, { stream: true });
        }
        content += decoder.decode();
        setPreviewText(content);
      } catch (error) {
        if (!controller.signal.aborted) {
          setPreviewError(error instanceof Error ? error.message : t('fileManager.previewFailed'));
        }
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    };

    loadTextPreview();
    return () => controller.abort();
  }, [previewRecord, t]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    const valid: QueueItem[] = [];
    files.forEach((file, index) => {
      if (file.size > MAX_FILE_BYTES) {
        message.error(t('fileManager.fileTooLarge', { name: file.name }));
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
              <img src={previewAddress(record)} alt="" loading="lazy" />
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
  const currentPreviewUrl = previewRecord ? previewAddress(previewRecord) : '';

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
          <span>{t('fileManager.dropzoneHint')}</span>
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
          {currentPreviewKind === 'text' &&
            (previewLoading ? (
              <Spin tip={t('fileManager.loadingFile')}>
                <div className={styles.previewLoading} />
              </Spin>
            ) : previewError ? (
              <div className={styles.previewMessage}>{previewError}</div>
            ) : (
              <pre>{previewText}</pre>
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
