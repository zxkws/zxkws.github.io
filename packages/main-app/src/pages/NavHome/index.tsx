import { Form, Input, InputNumber, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import SafeAppLink from '../../components/SafeAppLink';
import { useUser } from '../../context/UserContext';
import {
  createNavItem,
  deleteNavItem,
  fetchNavItems,
  type NavItem,
  type NavItemPayload,
  updateNavItem,
} from '../../services/navService';
import * as styles from './index.module.css';

type Feature = {
  name: string;
  description: string;
  path: string;
  icon: AppIconName;
  tag: string;
};

const publicTools: Feature[] = [
  {
    name: '文本比对',
    description: '并排检查两段文本的差异，快速定位新增、删除和修改。',
    path: '/v-app/text-difference',
    icon: 'diff',
    tag: 'Vue',
  },
  {
    name: 'JSON 工具',
    description: '浏览嵌套 JSON 数据，折叠复杂结构，专注查看原始值。',
    path: '/v-app/json-viewer',
    icon: 'braces',
    tag: 'Data',
  },
  {
    name: 'Curl Converter',
    description: '把 curl 请求转换为常见语言的调用代码，直接在浏览器中使用。',
    path: '/tools/curlconverter',
    icon: 'terminal',
    tag: 'HTTP',
  },
  {
    name: '象棋·镜',
    description: '识别棋盘局面并在二维棋盘中复现，提供独立的公开体验。',
    path: '/chess-mirror',
    icon: 'chess',
    tag: 'Vision',
  },
];

const workspaceFeatures = [
  {
    name: '数据库管控',
    description: '连接、资产与执行任务集中管理。',
    path: '/v-react/db-ops',
    icon: 'database' as const,
  },
  {
    name: 'AI 工作区',
    description: '助手、知识库、模型配置与调试。',
    path: '/v-react/assistants',
    icon: 'sparkles' as const,
  },
  {
    name: '权限与用户',
    description: '后台账号、角色和访问权限。',
    path: '/app/user-admin',
    icon: 'shield' as const,
  },
];

const buildLoginHref = () => {
  if (typeof window === 'undefined') return '/auth-app/#/login';
  const authBase =
    process.env.NODE_ENV === 'development' ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
  return `${authBase}/#/login?redirect=${encodeURIComponent(window.location.href)}`;
};

const Arrow = () => (
  <svg className={styles.arrowIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);

const ExternalArrow = () => (
  <svg className={styles.externalIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 5h5v5M19 5l-9 9M19 14v5H5V5h5" />
  </svg>
);

const NavHome = () => {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');

  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(false);
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
      setError(loadError instanceof Error ? loadError.message : '加载导航失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedKeyword) || item.url.toLowerCase().includes(normalizedKeyword),
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
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateNavItem(editing.id, values);
        message.success('已更新');
      } else {
        await createNavItem(values);
        message.success('已新增');
      }
      closeModal();
      await load();
    } catch (submitError) {
      message.error(submitError instanceof Error ? submitError.message : '保存失败');
    }
  };

  const remove = async (item: NavItem) => {
    if (!window.confirm(`删除 ${item.name}?`)) return;
    try {
      await deleteNavItem(item.id);
      message.success('已删除');
      await load();
    } catch (deleteError) {
      message.error(deleteError instanceof Error ? deleteError.message : '删除失败');
    }
  };

  return (
    <div className={styles.portal}>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.statusDot} />
              Developer portal · Personal workspace
            </div>
            <h1>
              把常用工具和
              <br />
              后台工作，
              <span>放进一个入口。</span>
            </h1>
            <p>
              ZXKWS 是一个持续生长的开发者门户。访客可以直接使用公开工具，登录后则进入数据库、AI、权限与个人效率工作台。
            </p>
            <div className={styles.heroActions}>
              <SafeAppLink className={styles.primaryButton} to="/v-app/text-difference">
                使用公开工具
                <Arrow />
              </SafeAppLink>
              {user ? (
                <SafeAppLink className={styles.secondaryButton} to="/v-react/db-ops">
                  进入工作台
                </SafeAppLink>
              ) : (
                <a className={styles.secondaryButton} href={buildLoginHref()}>
                  登录后台
                </a>
              )}
            </div>
            <div className={styles.heroMeta}>
              <span>公开访问</span>
              <span>微前端架构</span>
              <span>桌面与移动端</span>
            </div>
          </div>

          <div className={styles.productFrame} role="img" aria-label="ZXKWS 工作台界面预览">
            <div className={styles.frameBar}>
              <span className={styles.frameBrand}>
                <span className={styles.miniMark}>ϟ</span>
                zxkws / workspace
              </span>
              <span className={styles.frameShortcut}>⌘ K</span>
            </div>
            <div className={styles.frameBody}>
              <aside className={styles.frameSidebar}>
                {workspaceFeatures.map((feature, index) => (
                  <span className={index === 0 ? styles.frameItemActive : styles.frameItem} key={feature.name}>
                    <AppIcon name={feature.icon} size={14} />
                    {feature.name}
                  </span>
                ))}
              </aside>
              <div className={styles.frameContent}>
                <div className={styles.frameHeading}>
                  <div>
                    <span>DATABASE CONTROL</span>
                    <strong>资产总览</strong>
                  </div>
                  <span className={styles.liveBadge}>LIVE</span>
                </div>
                <div className={styles.statGrid}>
                  <div>
                    <span>Connections</span>
                    <strong>12</strong>
                    <small>Configured</small>
                  </div>
                  <div>
                    <span>Tasks</span>
                    <strong>28</strong>
                    <small>Recorded</small>
                  </div>
                </div>
                <div className={styles.codePanel}>
                  <div className={styles.codeBar}>
                    <span>query.sql</span>
                    <span>read only</span>
                  </div>
                  <code>
                    <span>select</span> name, status
                    <br />
                    <span>from</span> workspace.assets
                    <br />
                    <span>order by</span> sort;
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="tools">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionIndex}>01 / PUBLIC TOOLS</span>
            <h2>打开即用，不必先登录</h2>
          </div>
          <p>面向访客开放的实用工具，也是整个门户最直接的入口。</p>
        </div>

        <div className={styles.toolGrid}>
          {publicTools.map((tool) => (
            <SafeAppLink className={styles.toolCard} to={tool.path} key={tool.path}>
              <div className={styles.cardTopline}>
                <span className={styles.toolIcon}>
                  <AppIcon name={tool.icon} size={20} />
                </span>
                <span className={styles.toolTag}>{tool.tag}</span>
              </div>
              <div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </div>
              <span className={styles.cardLink}>
                打开工具
                <Arrow />
              </span>
            </SafeAppLink>
          ))}
        </div>
      </section>

      <section className={styles.workspaceSection} id="workspace">
        <div className={styles.workspaceInner}>
          <div className={styles.workspaceCopy}>
            <span className={styles.sectionIndex}>02 / PRIVATE WORKSPACE</span>
            <h2>公开门户背后，是每天真正使用的控制台。</h2>
            <p>
              登录后从同一个入口进入内部功能。侧栏保留完整功能导航，命令面板支持快速跳转，工作区继续承载现有微应用。
            </p>
            {user ? (
              <SafeAppLink className={styles.darkButton} to="/v-react/db-ops">
                打开控制台
                <Arrow />
              </SafeAppLink>
            ) : (
              <a className={styles.darkButton} href={buildLoginHref()}>
                登录后进入
                <Arrow />
              </a>
            )}
          </div>

          <div className={styles.capabilityList}>
            {workspaceFeatures.map((feature, index) => (
              <SafeAppLink className={styles.capabilityRow} to={feature.path} key={feature.path}>
                <span className={styles.capabilityNumber}>0{index + 1}</span>
                <span className={styles.capabilityIcon}>
                  <AppIcon name={feature.icon} size={20} />
                </span>
                <span>
                  <strong>{feature.name}</strong>
                  <small>{feature.description}</small>
                </span>
                <Arrow />
              </SafeAppLink>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.linksSection}`} id="links">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionIndex}>03 / SAVED LINKS</span>
            <h2>导航收藏</h2>
          </div>
          <p>共 {items.length} 项</p>
        </div>

        <div className={styles.linkToolbar}>
          <label className={styles.searchField}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
            <input placeholder="搜索名称或地址" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <button className={styles.outlineButton} onClick={load} type="button" disabled={loading}>
            {loading ? '加载中...' : '刷新'}
          </button>
          {isAdmin && (
            <button className={styles.primarySmallButton} onClick={openCreate} type="button">
              新增导航
            </button>
          )}
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        {visibleItems.length > 0 ? (
          <div className={styles.linkGrid}>
            {visibleItems.map((item) => (
              <article className={styles.linkCard} key={item.id}>
                <a href={item.url} target="_blank" rel="noreferrer" className={styles.linkMain}>
                  <span className={styles.linkGlyph}>
                    <ExternalArrow />
                  </span>
                  <span className={styles.linkText}>
                    <strong>{item.name}</strong>
                    <small>{item.url}</small>
                  </span>
                  {item.category && <span className={styles.category}>{item.category}</span>}
                </a>
                {isAdmin && (
                  <div className={styles.cardActions}>
                    <button type="button" onClick={() => openEdit(item)}>
                      编辑
                    </button>
                    <button type="button" onClick={() => remove(item)}>
                      删除
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          !loading && <div className={styles.emptyState}>{items.length === 0 ? '暂无导航项' : '没有匹配的导航项'}</div>
        )}
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.sectionIndex}>ONE SITE, TWO MODES</span>
          <h2>访客看到价值，你看到效率。</h2>
        </div>
        <SafeAppLink className={styles.primaryButton} to="/v-app/json-viewer">
          从公开工具开始
          <Arrow />
        </SafeAppLink>
      </section>

      <footer className={styles.footer}>
        <span>ZXKWS Developer Portal</span>
        <span>Tools · AI · Database · Workspace</span>
      </footer>

      <Modal
        open={creating || editing !== null}
        title={editing ? '编辑导航项' : '新增导航项'}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false} className={styles.navForm}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="url" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input maxLength={2000} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber className={styles.fullWidth} precision={0} />
          </Form.Item>
          <div className={styles.modalActions}>
            <button className={styles.outlineButton} type="button" onClick={closeModal}>
              取消
            </button>
            <button className={styles.primarySmallButton} type="button" onClick={submit}>
              保存
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default NavHome;
