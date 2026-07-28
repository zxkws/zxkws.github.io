import { Form, Input, InputNumber, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../../components/AppIcon';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../i18n';
import {
  createNavItem,
  deleteNavItem,
  fetchNavItems,
  type NavItem,
  type NavItemPayload,
  updateNavItem,
} from '../../services/navService';
import * as styles from './index.module.css';

const ExternalArrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 5h5v5M19 5l-9 9M19 14v5H5V5h5" />
  </svg>
);

export default function Navigation() {
  const { user } = useUser();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<NavItemPayload>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchNavItems());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('navigation.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    document.title = `${t('navigation.title')} · 光域`;
    load();
  }, [load, t]);

  const visibleItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.url.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query),
    );
  }, [items, keyword]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    form.resetFields();
  };

  const openEdit = (item: NavItem) => {
    setCreating(false);
    setEditing(item);
    form.setFieldsValue({
      name: item.name,
      url: item.url,
      category: item.category ?? undefined,
      sort: item.sort,
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    form.resetFields();
  };

  const submit = async () => {
    let values: NavItemPayload;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateNavItem(editing.id, values);
        message.success(t('navigation.updated'));
      } else {
        await createNavItem(values);
        message.success(t('navigation.created'));
      }
      closeModal();
      await load();
    } catch (saveError) {
      message.error(saveError instanceof Error ? saveError.message : t('navigation.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: NavItem) => {
    if (!window.confirm(t('navigation.deleteConfirm', { name: item.name }))) return;
    try {
      await deleteNavItem(item.id);
      message.success(t('navigation.deleted'));
      await load();
    } catch (deleteError) {
      message.error(deleteError instanceof Error ? deleteError.message : t('navigation.deleteFailed'));
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">{t('navigation.eyebrow')}</p>
          <h1>{t('navigation.title')}</h1>
          <p className="workspace-page__description">{t('navigation.description')}</p>
        </div>
        {isAdmin && (
          <button type="button" className="workspace-button workspace-button--primary" onClick={openCreate}>
            {t('navigation.create')}
          </button>
        )}
      </header>

      <section className={`workspace-panel ${styles.directory}`}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <AppIcon name="grid" size={18} />
            <input
              aria-label={t('navigation.search')}
              placeholder={t('navigation.search')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <span className={styles.count}>{t('navigation.count', { count: items.length })}</span>
          <button type="button" className="workspace-button" onClick={load} disabled={loading}>
            {loading ? t('common.refreshing') : t('common.refresh')}
          </button>
        </div>

        {error && <p className="workspace-feedback workspace-feedback--error">{error}</p>}

        <div className={styles.content} aria-busy={loading}>
          {visibleItems.length > 0 ? (
            <div className={styles.grid}>
              {visibleItems.map((item) => (
                <article className={styles.card} key={item.id}>
                  <a className={styles.cardLink} href={item.url} target="_blank" rel="noreferrer">
                    <span className={styles.cardIcon}>
                      <ExternalArrow />
                    </span>
                    <span className={styles.cardText}>
                      <strong>{item.name}</strong>
                      <small>{item.url}</small>
                    </span>
                    {item.category && <span className={styles.category}>{item.category}</span>}
                  </a>
                  {isAdmin && (
                    <div className={styles.actions}>
                      <button type="button" onClick={() => openEdit(item)}>
                        {t('common.edit')}
                      </button>
                      <button type="button" onClick={() => remove(item)}>
                        {t('common.delete')}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            !loading && (
              <div className={styles.empty}>{items.length === 0 ? t('navigation.empty') : t('navigation.noMatch')}</div>
            )
          )}
          {loading && items.length === 0 && <div className={styles.empty}>{t('navigation.loading')}</div>}
        </div>
      </section>

      <Modal
        open={creating || editing !== null}
        title={editing ? t('navigation.editTitle') : t('navigation.createTitle')}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false} className={styles.form}>
          <Form.Item
            name="name"
            label={t('navigation.name')}
            rules={[{ required: true, message: t('navigation.nameRequired') }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            name="url"
            label={t('navigation.url')}
            rules={[{ required: true, message: t('navigation.urlRequired') }]}
          >
            <Input maxLength={2000} />
          </Form.Item>
          <Form.Item name="category" label={t('navigation.category')}>
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item name="sort" label={t('navigation.sort')}>
            <InputNumber className={styles.fullWidth} precision={0} />
          </Form.Item>
          <div className={styles.modalActions}>
            <button type="button" className="workspace-button" onClick={closeModal} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={submit}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
