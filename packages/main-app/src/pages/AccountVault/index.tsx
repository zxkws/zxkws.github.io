import { Form, Input, Modal, message, Popconfirm } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CredentialEntry,
  type CredentialPayload,
  createCredential,
  deleteCredential,
  listCredentials,
  updateCredential,
} from '../../services/credentialVaultService';
import * as styles from './index.module.css';

const emptyDraft = (): CredentialPayload => ({
  account: '',
  password: '',
  notes: '',
});

export default function AccountVault() {
  const [entries, setEntries] = useState<CredentialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<CredentialEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDraft, setEntryDraft] = useState<CredentialPayload>(emptyDraft);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listCredentials());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '读取账号记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const openCreate = () => {
    setEditing(null);
    setEntryDraft(emptyDraft());
    setEntryOpen(true);
  };

  const openEdit = (entry: CredentialEntry) => {
    setEditing(entry);
    setEntryDraft({
      account: entry.account,
      password: entry.password,
      notes: entry.notes,
    });
    setEntryOpen(true);
  };

  const closeEntry = () => {
    setEntryOpen(false);
    setEditing(null);
    setEntryDraft(emptyDraft());
  };

  const saveEntry = async () => {
    const payload = {
      account: entryDraft.account.trim(),
      password: entryDraft.password,
      notes: entryDraft.notes,
    };
    if (!payload.account || !payload.password) {
      message.error('账户名和密码不能为空');
      return;
    }

    setBusy(true);
    try {
      const saved = editing
        ? await updateCredential(editing.id, { ...payload, version: editing.version })
        : await createCredential(payload);
      setEntries((current) =>
        editing ? current.map((entry) => (entry.id === saved.id ? saved : entry)) : [saved, ...current],
      );
      closeEntry();
      message.success(editing ? '账号记录已更新' : '账号记录已添加');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteCredential(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setRevealed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      message.success('账号记录已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label}已复制`);
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  const togglePassword = (id: string) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEntries = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (entry) => entry.account.toLowerCase().includes(query) || entry.notes.toLowerCase().includes(query),
    );
  }, [entries, keyword]);

  if (loading) {
    return (
      <div className="workspace-page">
        <section className="workspace-panel">正在读取账号记录…</section>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Account records</p>
          <h1>账号管理</h1>
          <p className="workspace-page__description">记录其他平台的账户名、密码和备注，当前按要求直接保存并回显。</p>
        </div>
        <div className="workspace-page__actions">
          <button className="workspace-button workspace-button--primary" type="button" onClick={openCreate}>
            添加账号
          </button>
        </div>
      </header>

      <section className="workspace-panel">
        <div className={styles.toolbar}>
          <Input.Search
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索账户名或备注"
            allowClear
          />
          <span>{filteredEntries.length} 条</span>
        </div>

        {filteredEntries.length ? (
          <div className={styles.grid}>
            {filteredEntries.map((entry) => (
              <article className={styles.card} key={entry.id}>
                <div className={styles.cardHeader}>
                  <h2>{entry.account}</h2>
                  <div className={styles.cardActions}>
                    <button type="button" onClick={() => openEdit(entry)}>
                      编辑
                    </button>
                    <Popconfirm
                      title="删除这条账号记录？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => void removeEntry(entry.id)}
                    >
                      <button type="button">删除</button>
                    </Popconfirm>
                  </div>
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>账户名</dt>
                    <dd>
                      <code>{entry.account}</code>
                      <button type="button" onClick={() => void copy(entry.account, '账户名')}>
                        复制
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>密码</dt>
                    <dd>
                      <code>{revealed.has(entry.id) ? entry.password : '••••••••••••'}</code>
                      <button type="button" onClick={() => togglePassword(entry.id)}>
                        {revealed.has(entry.id) ? '隐藏' : '显示'}
                      </button>
                      <button type="button" onClick={() => void copy(entry.password, '密码')}>
                        复制
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>备注</dt>
                    <dd>{entry.notes}</dd>
                  </div>
                  <div>
                    <dt>updatedAt</dt>
                    <dd>{entry.updatedAt}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>暂无账号记录</div>
        )}
      </section>

      <Modal
        title={editing ? '编辑账号记录' : '添加账号记录'}
        open={entryOpen}
        onCancel={closeEntry}
        onOk={() => void saveEntry()}
        confirmLoading={busy}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <Form layout="vertical">
          <Form.Item label="账户名" required>
            <Input
              value={entryDraft.account}
              maxLength={500}
              onChange={(event) => setEntryDraft({ ...entryDraft, account: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="密码" required>
            <Input.Password
              value={entryDraft.password}
              maxLength={10_000}
              autoComplete="new-password"
              onChange={(event) => setEntryDraft({ ...entryDraft, password: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="备注">
            <Input.TextArea
              rows={5}
              value={entryDraft.notes}
              maxLength={20_000}
              onChange={(event) => setEntryDraft({ ...entryDraft, notes: event.target.value })}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
