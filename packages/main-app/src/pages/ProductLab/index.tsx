import { useEffect, useMemo, useState } from 'react';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import LightSpaceMark from '../../components/LightSpaceMark';
import SafeAppLink from '../../components/SafeAppLink';
import * as styles from './index.module.css';

type ProductStatus = 'available' | 'foundation' | 'validation';

type ProductIdea = {
  sequence: string;
  title: string;
  englishTitle: string;
  status: ProductStatus;
  pitch: string;
  audience: string;
  icon: AppIconName;
  capabilities: string[];
  delivered: string[];
  next: string[];
  action: {
    label: string;
    path: string;
    kind: 'app' | 'auth';
  };
};

const statusCopy: Record<ProductStatus, { label: string; short: string }> = {
  available: { label: 'MVP 已可用', short: 'Live MVP' },
  foundation: { label: '基础能力已接入', short: 'Foundation' },
  validation: { label: '概念验证中', short: 'Validation' },
};

const ideas: ProductIdea[] = [
  {
    sequence: '01',
    title: '同步放映厅',
    englishTitle: 'Watch Together',
    status: 'available',
    pitch: '让异地的人进入同一房间，在同一进度观看内容，并在旁路完成实时交流。',
    audience: '异地朋友、情侣与小型兴趣社群',
    icon: 'video',
    capabilities: ['房间链接', '播放同步', '漂移纠偏', '实时聊天'],
    delivered: ['创建或加入房间', '直链媒体播放', '播放、暂停与进度同步', '房间成员和文字聊天'],
    next: ['房主与授权控制', 'HLS 播放支持', '断线重连质量指标', '房间治理与限流'],
    action: {
      label: '进入同步放映厅',
      path: '/app/watch-together',
      kind: 'app',
    },
  },
  {
    sequence: '02',
    title: '多登录认证中枢',
    englishTitle: 'Auth Multi-Login Hub',
    status: 'foundation',
    pitch: '让业务只面对一套账号协议，把密码、短信和第三方身份统一收拢到稳定的登录入口。',
    audience: '个人产品、中小团队与企业内部平台',
    icon: 'shield',
    capabilities: ['账号密码', '短信验证码', 'GitHub OAuth', '统一回跳'],
    delivered: ['账号密码登录与注册', '手机号验证码登录', 'GitHub OAuth 入口', '安全回跳与登录保护'],
    next: ['微信扫码登录', '支付宝 OAuth', 'Google OAuth', '身份绑定与登录审计'],
    action: {
      label: '查看统一登录入口',
      path: '/auth-app/#/login',
      kind: 'auth',
    },
  },
  {
    sequence: '03',
    title: '云端 AI 开发平台',
    englishTitle: 'Cloud MCP Platform',
    status: 'validation',
    pitch: '在浏览器中用自然语言驱动可执行、可验证、可审计的工程代理，最终交付可审查的代码变更。',
    audience: '独立开发者、小团队与内部平台团队',
    icon: 'sparkles',
    capabilities: ['BYOM', 'BYOT / MCP', '真实 Workspace', 'PR-first'],
    delivered: ['AI 助手工作区', '知识库管理', '模型配置与调试', '统一后台基础设施'],
    next: ['隔离工作区生命周期', '计划—修改—验证执行环', 'GitHub PR 交付', '审计日志与成本配额'],
    action: {
      label: '查看 AI 工作区基础',
      path: '/v-react/assistants',
      kind: 'app',
    },
  },
];

const productIdeasRepository = 'https://github.com/zxkws/product-ideas';

const buildAuthHref = () => {
  if (typeof window === 'undefined') return '/auth-app/#/login';
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5183/#/login';
  }
  return `${window.location.origin}/auth-app/#/login`;
};

const Arrow = ({ external = false }: { external?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {external ? <path d="M14 5h5v5M19 5l-9 9M19 14v5H5V5h5" /> : <path d="M5 12h14M14 7l5 5-5 5" />}
  </svg>
);

const ProductLab = () => {
  const [filter, setFilter] = useState<'all' | ProductStatus>('all');
  const visibleIdeas = useMemo(
    () => (filter === 'all' ? ideas : ideas.filter((idea) => idea.status === filter)),
    [filter],
  );

  useEffect(() => {
    document.title = '产品构想 · 光域 LightSpace';
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <LightSpaceMark />
              LightSpace Product Foundry
            </span>
            <h1>
              想法不该只停留在
              <span>README。</span>
            </h1>
            <p>
              这里收拢光域曾经提出的产品构想，并公开它们从问题、MVP
              到真实入口的进度。已经能运行的直接体验，仍在验证的明确下一步。
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#portfolio">
                查看落地进度
                <Arrow />
              </a>
              <a className={styles.secondaryButton} href={productIdeasRepository} target="_blank" rel="noreferrer">
                原始构想仓库
                <Arrow external />
              </a>
            </div>
          </div>

          <div className={styles.progressPanel}>
            <div className={styles.panelTop}>
              <span>product-ideas / delivery.map</span>
              <span className={styles.panelLive}>ACTIVE</span>
            </div>
            <div className={styles.progressRows}>
              {ideas.map((idea) => (
                <div className={styles.progressRow} key={idea.sequence}>
                  <span>{idea.sequence}</span>
                  <div>
                    <strong>{idea.englishTitle}</strong>
                    <small>{idea.title}</small>
                  </div>
                  <span data-status={idea.status}>{statusCopy[idea.status].short}</span>
                </div>
              ))}
            </div>
            <div className={styles.panelSummary}>
              <div>
                <strong>3</strong>
                <span>公开构想</span>
              </div>
              <div>
                <strong>2</strong>
                <span>已有入口</span>
              </div>
              <div>
                <strong>1</strong>
                <span>核心验证</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.main} id="portfolio">
        <div className={styles.heading}>
          <div>
            <span className={styles.sectionIndex}>01 / PRODUCT PORTFOLIO</span>
            <h2>从构想到可验证产品</h2>
          </div>
          <p>状态只描述当前真实进度。已有入口不等于全部完成；未完成的能力会继续保留在下一阶段。</p>
        </div>

        <div className={styles.filters}>
          {[
            { value: 'all' as const, label: '全部', count: ideas.length },
            { value: 'available' as const, label: 'MVP 已可用', count: 1 },
            { value: 'foundation' as const, label: '基础能力', count: 1 },
            { value: 'validation' as const, label: '概念验证', count: 1 },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <span>{option.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.ideaList}>
          {visibleIdeas.map((idea) => (
            <article className={styles.ideaCard} data-status={idea.status} key={idea.sequence}>
              <div className={styles.ideaIntro}>
                <div className={styles.ideaIdentity}>
                  <span className={styles.ideaIcon}>
                    <AppIcon name={idea.icon} size={22} />
                  </span>
                  <span className={styles.ideaSequence}>{idea.sequence}</span>
                </div>
                <div className={styles.ideaTitle}>
                  <span>{idea.englishTitle}</span>
                  <h3>{idea.title}</h3>
                </div>
                <span className={styles.status}>{statusCopy[idea.status].label}</span>
              </div>

              <div className={styles.ideaBody}>
                <div className={styles.pitch}>
                  <p>{idea.pitch}</p>
                  <small>目标用户：{idea.audience}</small>
                </div>
                <div className={styles.tags}>
                  {idea.capabilities.map((capability) => (
                    <span key={capability}>{capability}</span>
                  ))}
                </div>
              </div>

              <details className={styles.deliveryDetails}>
                <summary>查看交付边界与下一阶段</summary>
                <div className={styles.deliveryGrid}>
                  <div>
                    <span>DELIVERED</span>
                    <ul>
                      {idea.delivered.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span>NEXT</span>
                    <ul>
                      {idea.next.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>

              <div className={styles.ideaFooter}>
                <span>LightSpace Foundry / {idea.sequence}</span>
                {idea.action.kind === 'auth' ? (
                  <a href={buildAuthHref()}>
                    {idea.action.label}
                    <Arrow />
                  </a>
                ) : (
                  <SafeAppLink to={idea.action.path}>
                    {idea.action.label}
                    <Arrow />
                  </SafeAppLink>
                )}
              </div>
            </article>
          ))}
        </div>

        <section className={styles.method}>
          <div>
            <span className={styles.sectionIndex}>02 / BUILD PRINCIPLES</span>
            <h2>每个构想都经过同一条落地路径。</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <strong>先锁定问题</strong>
              <p>明确目标用户、使用场景和不做什么，避免功能先于需求。</p>
            </li>
            <li>
              <span>02</span>
              <strong>做最短闭环</strong>
              <p>让关键价值先跑通，用真实入口替代只存在于文档里的路线图。</p>
            </li>
            <li>
              <span>03</span>
              <strong>公开真实进度</strong>
              <p>把已交付、待验证与风险边界分开写清，持续迭代而不夸大完成度。</p>
            </li>
          </ol>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>光域 LIGHTSPACE / PRODUCT FOUNDRY</span>
        <a href="/">返回光域主页</a>
      </footer>
    </div>
  );
};

export default ProductLab;
