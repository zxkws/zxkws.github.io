import { Form, Input, InputNumber, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import LightSpaceMark from '../../components/LightSpaceMark';
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

const researchLayers = [
  {
    index: '01',
    eyebrow: 'Avatar',
    name: '人物本体',
    description: '从真人视频、2D 形象到 3D 模型，先确定角色以什么形态存在。',
    stack: '视频 / 2D / 3D',
  },
  {
    index: '02',
    eyebrow: 'Drive',
    name: '声音与驱动',
    description: '连接 TTS、语音识别、表情、动作和口型，让角色自然地说话与回应。',
    stack: 'TTS / ASR / Motion',
  },
  {
    index: '03',
    eyebrow: 'Render',
    name: '画面生成',
    description: '通过 AI 视频或实时引擎组织灯光、材质、视角与连续画面。',
    stack: 'AI Video / Unity / Unreal',
  },
  {
    index: '04',
    eyebrow: 'Display',
    name: '空间呈现',
    description: '把结果输出到网页、视频流、大屏或透明展柜，完成最终体验。',
    stack: 'WebRTC / Screen / Spatial',
  },
];

const lightSpaceRepository = 'https://github.com/hqli2005/LightSpace';

const productIdeas = [
  {
    status: 'MVP 已可用',
    name: '同步放映厅',
    description: '异地多人同步播放、进度纠偏与实时聊天。',
    icon: 'video' as const,
  },
  {
    status: '基础已接入',
    name: '多登录认证中枢',
    description: '密码、短信与第三方身份的统一登录入口。',
    icon: 'shield' as const,
  },
  {
    status: '概念验证中',
    name: '云端 AI 开发平台',
    description: '可执行、可验证、可审计的工程代理工作流。',
    icon: 'sparkles' as const,
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
              LightSpace / 光域 · Digital human lab
            </div>
            <h1>
              让数字人，
              <br />
              走进真实世界。
              <span>从生成，到交互与呈现。</span>
            </h1>
            <p>
              光域是一项围绕 AI
              数字人、智能交互与空间呈现持续演进的个人项目。从声音、人脸、动作、表情与口型，到渲染、视频流和显示设备，把每一层拆开研究，再组合成可落地的体验。
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#research">
                查看研究路线
                <Arrow />
              </a>
              <a className={styles.secondaryButton} href={lightSpaceRepository} target="_blank" rel="noreferrer">
                GitHub 项目
                <ExternalArrow />
              </a>
            </div>
            <div className={styles.heroMeta}>
              <span>AI 数字人</span>
              <span>实时交互</span>
              <span>空间展示</span>
            </div>
          </div>

          <div className={styles.productFrame} role="img" aria-label="光域数字人系统界面预览">
            <div className={styles.frameBar}>
              <span className={styles.frameBrand}>
                <span className={styles.miniMark}>
                  <LightSpaceMark />
                </span>
                lightspace / avatar-lab
              </span>
              <span className={styles.frameShortcut}>⌘ K</span>
            </div>
            <div className={styles.frameBody}>
              <aside className={styles.frameSidebar}>
                {researchLayers.map((layer, index) => (
                  <span className={index === 1 ? styles.frameItemActive : styles.frameItem} key={layer.name}>
                    <span className={styles.frameLayerCode}>{layer.index}</span>
                    {layer.name}
                  </span>
                ))}
              </aside>
              <div className={styles.frameContent}>
                <div className={styles.frameHeading}>
                  <div>
                    <span>DIGITAL HUMAN SYSTEM</span>
                    <strong>从内容到空间呈现</strong>
                  </div>
                  <span className={styles.liveBadge}>LAB</span>
                </div>
                <div className={styles.statGrid}>
                  <div>
                    <span>INPUT</span>
                    <strong>文本 · 音频</strong>
                    <small>脚本与真实驱动信号</small>
                  </div>
                  <div>
                    <span>OUTPUT</span>
                    <strong>画面 · 空间</strong>
                    <small>视频、流与显示设备</small>
                  </div>
                </div>
                <div className={styles.codePanel}>
                  <div className={styles.codeBar}>
                    <span>system.pipeline</span>
                    <span>research map</span>
                  </div>
                  <code>
                    <span>actor</span> = avatar + identity
                    <br />
                    <span>drive</span> = voice + motion + lip_sync
                    <br />
                    <span>render</span> = light + material + camera
                    <br />
                    <span>display</span> = web + stream + space
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.researchSection}`} id="research">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionIndex}>01 / DIGITAL HUMAN RESEARCH</span>
            <h2>一个数字人系统，不只是一个会说话的人。</h2>
          </div>
          <p>
            光域关注完整链路：人物以什么形态存在，如何被语音和动作驱动，怎样生成画面，最后又通过什么媒介走到用户面前。
          </p>
        </div>

        <div className={styles.researchFormula}>
          <span>演员</span>
          <i>×</i>
          <span>动作和台词</span>
          <i>×</i>
          <span>摄影棚与灯光</span>
          <i>×</i>
          <span>屏幕与空间</span>
        </div>

        <div className={styles.researchGrid}>
          {researchLayers.map((layer) => (
            <article className={styles.researchCard} key={layer.index}>
              <div className={styles.researchCardTop}>
                <span>{layer.index}</span>
                <small>{layer.eyebrow}</small>
              </div>
              <h3>{layer.name}</h3>
              <p>{layer.description}</p>
              <code>{layer.stack}</code>
            </article>
          ))}
        </div>

        <div className={styles.researchNote}>
          <div>
            <span className={styles.sectionIndex}>CURRENT FOCUS</span>
            <strong>自然表达，比“看起来像人”更重要。</strong>
          </div>
          <p>
            当前重点是中文语音质量、表情与语义协调、可控肢体动作、口型对齐，以及从预渲染视频走向实时互动的工程组合。
          </p>
          <a href={lightSpaceRepository} target="_blank" rel="noreferrer">
            查看 LightSpace 源码
            <ExternalArrow />
          </a>
        </div>
      </section>

      <section className={`${styles.section} ${styles.productIdeasSection}`} id="products">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionIndex}>02 / PRODUCT FOUNDRY</span>
            <h2>把曾经想做的产品，变成真实入口。</h2>
          </div>
          <p>产品构想实验室公开记录三个方向的落地进度：同步放映、统一认证，以及基于 MCP 的云端 AI 开发平台。</p>
        </div>

        <div className={styles.productIdeasGrid}>
          <div className={styles.productIdeasCopy}>
            <span>FROM README TO PRODUCT</span>
            <h3>不隐藏未完成，也不让想法永远停留在草稿。</h3>
            <p>每个方向都拆成已经交付的最短闭环、明确的下一阶段，以及能够直接进入的真实界面。</p>
            <SafeAppLink className={styles.secondaryButton} to="/product-lab">
              打开产品构想实验室
              <Arrow />
            </SafeAppLink>
          </div>
          <div className={styles.productIdeasList}>
            {productIdeas.map((idea, index) => (
              <div className={styles.productIdeaRow} key={idea.name}>
                <span className={styles.productIdeaIcon}>
                  <AppIcon name={idea.icon} size={19} />
                </span>
                <span className={styles.productIdeaNumber}>0{index + 1}</span>
                <span>
                  <strong>{idea.name}</strong>
                  <small>{idea.description}</small>
                </span>
                <em>{idea.status}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="tools">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.sectionIndex}>03 / OPEN TOOLS</span>
            <h2>研究之外，也保留真正好用的工具。</h2>
          </div>
          <p>访客无需登录即可使用；这些工具也承担着视觉识别、数据处理与内容生产过程中的日常辅助工作。</p>
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
            <span className={styles.sectionIndex}>04 / PRIVATE LAB CONSOLE</span>
            <h2>公开研究背后，是持续运转的个人控制台。</h2>
            <p>
              登录后从同一个入口管理 AI
              助手、知识库、数据库、任务、权限与个人笔记。门户负责表达光域，控制台负责支撑它继续生长。
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
            <span className={styles.sectionIndex}>05 / REFERENCE FIELD</span>
            <h2>参考资料与导航</h2>
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
          <span className={styles.sectionIndex}>OPEN RESEARCH, PRIVATE OPERATIONS</span>
          <h2>让研究过程可见，也让日常工作保持高效。</h2>
        </div>
        <a className={styles.primaryButton} href={lightSpaceRepository} target="_blank" rel="noreferrer">
          在 GitHub 查看光域
          <ExternalArrow />
        </a>
      </section>

      <footer className={styles.footer}>
        <span>光域 LIGHTSPACE</span>
        <span>Digital Human · AI Systems · Creative Technology</span>
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
