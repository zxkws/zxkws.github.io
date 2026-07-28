import { Button, Form, Input, Modal, message, Popconfirm, Space } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CredentialPayload,
  createVaultMaterial,
  decryptCredential,
  encryptCredential,
  generateCredentialPassword,
  unlockVault,
} from '../../services/credentialVaultCrypto';
import {
  createEncryptedCredential,
  deleteEncryptedCredential,
  type EncryptedCredentialEntry,
  getVaultMetadata,
  listEncryptedCredentials,
  resetVault,
  rotateVault,
  setupVault,
  updateEncryptedCredential,
  type VaultMetadata,
} from '../../services/credentialVaultService';
import * as styles from './index.module.css';

type DecryptedEntry = EncryptedCredentialEntry & CredentialPayload;
type EntryDraft = CredentialPayload;

const emptyDraft = (): EntryDraft => ({
  name: '',
  platform: '',
  account: '',
  secret: '',
  url: '',
  notes: '',
});

const metadataPayload = (material: Awaited<ReturnType<typeof createVaultMaterial>>) => ({
  kdfSalt: material.kdfSalt,
  kdfIterations: material.kdfIterations,
  checkIv: material.iv,
  checkCiphertext: material.ciphertext,
});

export default function AccountVault() {
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [entries, setEntries] = useState<DecryptedEntry[]>([]);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [masterConfirm, setMasterConfirm] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<DecryptedEntry | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(emptyDraft);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [changeOpen, setChangeOpen] = useState(false);
  const [newMaster, setNewMaster] = useState('');
  const [newMasterConfirm, setNewMasterConfirm] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  const lock = useCallback(() => {
    setVaultKey(null);
    setEntries([]);
    setRevealed(new Set());
    setMasterPassword('');
    setMasterConfirm('');
    setEditing(null);
    setEntryDraft(emptyDraft());
    setEntryOpen(false);
    setChangeOpen(false);
    setNewMaster('');
    setNewMasterConfirm('');
    setCorruptedCount(0);
  }, []);

  const loadEntries = useCallback(async (key: CryptoKey) => {
    const encrypted = await listEncryptedCredentials();
    const decrypted = await Promise.allSettled(
      encrypted.map(async (entry) => ({
        ...entry,
        ...(await decryptCredential(key, entry)),
      })),
    );
    const available = decrypted.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const damaged = decrypted.length - available.length;
    setEntries(available);
    setCorruptedCount(damaged);
    if (damaged) message.warning(`${damaged} 条记录无法解密，已停止展示`);
  }, []);

  useEffect(() => {
    getVaultMetadata()
      .then(setMetadata)
      .catch((error) => message.error(error instanceof Error ? error.message : '读取保险库失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!vaultKey) return;
    let timer = 0;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, 10 * 60 * 1000);
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    resetTimer();
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [lock, vaultKey]);

  const setup = async () => {
    if (masterPassword.length < 12) {
      message.error('主密码至少 12 位');
      return;
    }
    if (masterPassword !== masterConfirm) {
      message.error('两次输入的主密码不一致');
      return;
    }
    setBusy(true);
    try {
      const material = await createVaultMaterial(masterPassword);
      const nextMetadata = await setupVault(metadataPayload(material));
      setMetadata(nextMetadata);
      setVaultKey(material.key);
      setMasterPassword('');
      setMasterConfirm('');
      setEntries([]);
      message.success('账号保险库已创建');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '初始化失败');
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    if (!metadata?.configured) return;
    setBusy(true);
    try {
      const key = await unlockVault(masterPassword, metadata);
      await loadEntries(key);
      setVaultKey(key);
      setMasterPassword('');
    } catch {
      message.error('主密码不正确，或保险库数据已经损坏');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setEntryDraft(emptyDraft());
    setEntryOpen(true);
  };

  const openEdit = (entry: DecryptedEntry) => {
    setEditing(entry);
    setEntryDraft({
      name: entry.name,
      platform: entry.platform,
      account: entry.account,
      secret: entry.secret,
      url: entry.url,
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
    if (!vaultKey) return;
    if (!entryDraft.name.trim() || !entryDraft.platform.trim()) {
      message.error('名称和平台不能为空');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...entryDraft,
        name: entryDraft.name.trim(),
        platform: entryDraft.platform.trim(),
      };
      const encrypted = await encryptCredential(vaultKey, payload);
      if (editing) {
        await updateEncryptedCredential(editing.id, { ...encrypted, version: editing.version });
        message.success('账号记录已更新');
      } else {
        await createEncryptedCredential(encrypted);
        message.success('账号记录已添加');
      }
      closeEntry();
      await loadEntries(vaultKey);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (!vaultKey) return;
    try {
      await deleteEncryptedCredential(id);
      await loadEntries(vaultKey);
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

  const changeMasterPassword = async () => {
    if (!vaultKey) return;
    if (corruptedCount) {
      message.error('存在无法解密的记录，不能更换主密码');
      return;
    }
    if (newMaster.length < 12) {
      message.error('新主密码至少 12 位');
      return;
    }
    if (newMaster !== newMasterConfirm) {
      message.error('两次输入的新主密码不一致');
      return;
    }
    setBusy(true);
    try {
      const material = await createVaultMaterial(newMaster);
      const encryptedEntries = await Promise.all(
        entries.map(async (entry) => {
          const encrypted = await encryptCredential(material.key, {
            name: entry.name,
            platform: entry.platform,
            account: entry.account,
            secret: entry.secret,
            url: entry.url,
            notes: entry.notes,
          });
          return { id: entry.id, version: entry.version, ...encrypted };
        }),
      );
      const nextMetadata = await rotateVault({
        ...metadataPayload(material),
        entries: encryptedEntries,
      });
      setMetadata(nextMetadata);
      setVaultKey(material.key);
      await loadEntries(material.key);
      setChangeOpen(false);
      setNewMaster('');
      setNewMasterConfirm('');
      message.success('主密码已更换，全部记录已重新加密');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更换主密码失败');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (resetConfirmation !== 'DELETE') return;
    setBusy(true);
    try {
      await resetVault();
      lock();
      setMetadata({ configured: false });
      setResetOpen(false);
      setResetConfirmation('');
      message.success('账号保险库及其记录已清空');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空失败');
    } finally {
      setBusy(false);
    }
  };

  const filteredEntries = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.name, entry.platform, entry.account, entry.url].some((value) => value.toLowerCase().includes(query)),
    );
  }, [entries, keyword]);

  if (loading) {
    return (
      <div className="workspace-page">
        <section className="workspace-panel">正在读取账号保险库…</section>
      </div>
    );
  }

  if (!metadata?.configured) {
    return (
      <div className="workspace-page">
        <header className="workspace-page__header">
          <div>
            <p className="workspace-page__eyebrow">Personal credential vault</p>
            <h1>账号保险库</h1>
            <p className="workspace-page__description">保存其他 App 和平台的账号、密码、Token 与备注。</p>
          </div>
        </header>
        <section className={`workspace-panel ${styles.gate}`}>
          <div>
            <h2>创建主密码</h2>
            <p>主密码只在当前浏览器中用于加密，不会发送给服务端。忘记后无法恢复已有记录。</p>
          </div>
          <label className="workspace-field">
            <span>主密码</span>
            <input
              className="workspace-input"
              type="password"
              autoComplete="new-password"
              value={masterPassword}
              onChange={(event) => setMasterPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setup()}
            />
          </label>
          <label className="workspace-field">
            <span>确认主密码</span>
            <input
              className="workspace-input"
              type="password"
              autoComplete="new-password"
              value={masterConfirm}
              onChange={(event) => setMasterConfirm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && setup()}
            />
          </label>
          <button className="workspace-button workspace-button--primary" type="button" onClick={setup} disabled={busy}>
            {busy ? '正在创建…' : '创建保险库'}
          </button>
        </section>
      </div>
    );
  }

  if (!vaultKey) {
    return (
      <div className="workspace-page">
        <header className="workspace-page__header">
          <div>
            <p className="workspace-page__eyebrow">Personal credential vault</p>
            <h1>账号保险库</h1>
            <p className="workspace-page__description">保险库已锁定，输入主密码后在浏览器中解密。</p>
          </div>
        </header>
        <section className={`workspace-panel ${styles.gate}`}>
          <label className="workspace-field">
            <span>主密码</span>
            <input
              className="workspace-input"
              type="password"
              autoComplete="current-password"
              value={masterPassword}
              onChange={(event) => setMasterPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && unlock()}
            />
          </label>
          <div className="workspace-inline-actions">
            <button
              className="workspace-button workspace-button--primary"
              type="button"
              onClick={unlock}
              disabled={busy || !masterPassword}
            >
              {busy ? '正在解锁…' : '解锁'}
            </button>
            <button className="workspace-button" type="button" onClick={() => setResetOpen(true)}>
              忘记主密码
            </button>
          </div>
        </section>
        <Modal
          title="清空账号保险库"
          open={resetOpen}
          onCancel={() => {
            setResetOpen(false);
            setResetConfirmation('');
          }}
          onOk={reset}
          okButtonProps={{ danger: true, disabled: resetConfirmation !== 'DELETE' }}
          confirmLoading={busy}
          okText="永久清空"
          cancelText="取消"
        >
          <p>主密码无法找回。清空会永久删除全部加密记录。请输入 DELETE 继续。</p>
          <Input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} />
        </Modal>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Personal credential vault</p>
          <h1>账号保险库</h1>
          <p className="workspace-page__description">所有敏感字段均在浏览器中加密，服务端只保存密文。</p>
        </div>
        <div className="workspace-page__actions">
          <button className="workspace-button" type="button" onClick={() => setChangeOpen(true)}>
            更换主密码
          </button>
          <button className="workspace-button" type="button" onClick={lock}>
            锁定
          </button>
          <button className="workspace-button workspace-button--primary" type="button" onClick={openCreate}>
            添加账号
          </button>
        </div>
      </header>

      {corruptedCount > 0 && (
        <div className="workspace-feedback workspace-feedback--error" role="alert">
          {corruptedCount} 条记录无法解密。为防止数据丢失，当前禁止更换主密码。
        </div>
      )}

      <section className="workspace-panel">
        <div className={styles.toolbar}>
          <Input.Search
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索名称、平台、账号或地址"
            allowClear
          />
          <span>{filteredEntries.length} 条</span>
        </div>
        {filteredEntries.length ? (
          <div className={styles.grid}>
            {filteredEntries.map((entry) => (
              <article className={styles.card} key={entry.id}>
                <div className={styles.cardHeader}>
                  <div>
                    <span>{entry.platform}</span>
                    <h2>{entry.name}</h2>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" onClick={() => openEdit(entry)}>
                      编辑
                    </button>
                    <Popconfirm
                      title="删除这条账号记录？"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => removeEntry(entry.id)}
                    >
                      <button type="button">删除</button>
                    </Popconfirm>
                  </div>
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>账号</dt>
                    <dd>
                      <code>{entry.account}</code>
                      {entry.account && (
                        <button type="button" onClick={() => copy(entry.account, '账号')}>
                          复制
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>密码 / Token</dt>
                    <dd>
                      <code>{revealed.has(entry.id) ? entry.secret : entry.secret ? '••••••••••••' : ''}</code>
                      {entry.secret && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealed((current) => {
                                const next = new Set(current);
                                next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
                                return next;
                              })
                            }
                          >
                            {revealed.has(entry.id) ? '隐藏' : '显示'}
                          </button>
                          <button type="button" onClick={() => copy(entry.secret, '密码')}>
                            复制
                          </button>
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>地址</dt>
                    <dd>
                      {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">
                          {entry.url}
                        </a>
                      ) : null}
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
        onOk={saveEntry}
        confirmLoading={busy}
        okText="保存"
        cancelText="取消"
        width={620}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input
              value={entryDraft.name}
              maxLength={120}
              onChange={(event) => setEntryDraft({ ...entryDraft, name: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="平台" required>
            <Input
              value={entryDraft.platform}
              maxLength={120}
              onChange={(event) => setEntryDraft({ ...entryDraft, platform: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="账号 / 用户名">
            <Input
              value={entryDraft.account}
              maxLength={500}
              onChange={(event) => setEntryDraft({ ...entryDraft, account: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="密码 / Token / 密钥">
            <Space.Compact block>
              <Input.Password
                value={entryDraft.secret}
                maxLength={10_000}
                autoComplete="new-password"
                onChange={(event) => setEntryDraft({ ...entryDraft, secret: event.target.value })}
              />
              <Button
                type="default"
                onClick={() => setEntryDraft({ ...entryDraft, secret: generateCredentialPassword() })}
              >
                生成
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item label="登录地址">
            <Input
              value={entryDraft.url}
              maxLength={2_000}
              onChange={(event) => setEntryDraft({ ...entryDraft, url: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="备注">
            <Input.TextArea
              rows={4}
              value={entryDraft.notes}
              maxLength={20_000}
              onChange={(event) => setEntryDraft({ ...entryDraft, notes: event.target.value })}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="更换主密码"
        open={changeOpen}
        onCancel={() => {
          setChangeOpen(false);
          setNewMaster('');
          setNewMasterConfirm('');
        }}
        onOk={changeMasterPassword}
        confirmLoading={busy}
        okText="重新加密"
        cancelText="取消"
      >
        <p>更换时会在浏览器中解密并重新加密全部记录，服务端仍然只接收密文。</p>
        <Form layout="vertical">
          <Form.Item label="新主密码">
            <Input.Password
              value={newMaster}
              autoComplete="new-password"
              onChange={(event) => setNewMaster(event.target.value)}
            />
          </Form.Item>
          <Form.Item label="确认新主密码">
            <Input.Password
              value={newMasterConfirm}
              autoComplete="new-password"
              onChange={(event) => setNewMasterConfirm(event.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
