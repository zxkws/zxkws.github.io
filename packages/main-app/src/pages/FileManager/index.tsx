import { Button, message, Popconfirm, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUploadRecords,
  listUploadRecords,
  type UploadRecord,
  uploadManagedFile,
} from '../../services/fileManagerService';
import * as styles from './index.module.css';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

type QueueItem = {
  key: string;
  file: File;
  status: 'waiting' | 'uploading' | 'success' | 'failed';
  result?: string;
};

export default function FileManager() {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listUploadRecords());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '读取上传记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploading) return;
    const valid: QueueItem[] = [];
    files.forEach((file, index) => {
      if (file.size > MAX_FILE_BYTES) {
        message.error(`${file.name} 超过 50 MB，未加入上传`);
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
                  result: error instanceof Error ? error.message : '上传失败',
                }
              : queued,
          ),
        );
      }
    }
    setUploading(false);
    if (successCount) {
      message.success(`${successCount} 个文件上传成功`);
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
      message.success('远端文件和上传记录已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败，本地记录已保留');
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success('文件地址已复制');
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  const columns: ColumnsType<UploadRecord> = useMemo(
    () => [
      {
        title: '文件',
        dataIndex: 'filename',
        key: 'filename',
        render: (filename: string, record) => (
          <div className={styles.fileCell}>
            {record.mimeType?.startsWith('image/') ? (
              <img src={record.signedUrl || record.url} alt="" loading="lazy" />
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
        title: '地址',
        dataIndex: 'url',
        key: 'url',
        width: 180,
        render: (url: string, record) => (
          <Space>
            <a href={record.signedUrl || url} target="_blank" rel="noopener noreferrer">
              打开
            </a>
            <button className={styles.linkButton} type="button" onClick={() => copy(url)}>
              复制
            </button>
          </Space>
        ),
      },
    ],
    [],
  );

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">File storage</p>
          <h1>文件管理</h1>
          <p className="workspace-page__description">上传任意文件类型到个人文件存储，并管理真实上传记录。</p>
        </div>
        <div className="workspace-page__actions">
          <Button onClick={load} loading={loading}>
            刷新
          </Button>
          <Popconfirm
            title={`删除选中的 ${selectedIds.length} 个文件？`}
            description="远端文件和本地上传记录都会删除，此操作不可恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={removeSelected}
            disabled={!selectedIds.length}
          >
            <Button danger disabled={!selectedIds.length}>
              删除所选
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
          <strong>{uploading ? '正在上传…' : '拖拽文件到这里，或点击选择文件'}</strong>
          <span>支持任意文件类型，单个文件不超过 50 MB；文件按顺序上传，避免占用过多内存。</span>
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
                <strong data-status={item.status}>{item.status}</strong>
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
          locale={{ emptyText: loading ? '正在读取上传记录…' : '暂无上传记录' }}
        />
      </section>
    </div>
  );
}
