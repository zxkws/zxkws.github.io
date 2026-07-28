import { useEffect, useState } from 'react';
import AppIcon, { type AppIconName } from '../../components/AppIcon';
import SafeAppLink from '../../components/SafeAppLink';
import { useUser } from '../../context/UserContext';
import { agentPlatformService } from '../../services/agentPlatformService';
import { type AuthProviderStatus, authSecurityService } from '../../services/authSecurityService';
import * as styles from './index.module.css';

type FunctionalProduct = {
  title: string;
  englishTitle: string;
  description: string;
  icon: AppIconName;
  path: string;
  access: 'public' | 'user' | 'admin';
};

const products: FunctionalProduct[] = [
  {
    title: '同步放映厅',
    englishTitle: 'Watch Together',
    description: '创建带密码的房间，同步 MP4/HLS 播放并管理成员、发言和控制权。',
    icon: 'video',
    path: '/app/watch-together',
    access: 'public',
  },
  {
    title: '身份与安全',
    englishTitle: 'Auth Multi-Login Hub',
    description: '使用密码、短信或第三方 OAuth 登录，绑定统一身份并查看登录审计。',
    icon: 'shield',
    path: '/app/security-center',
    access: 'user',
  },
  {
    title: 'Agent 平台',
    englishTitle: 'Cloud MCP Platform',
    description: '组合 Skill、知识库和真实 MCP 工具，通过 LangGraph 执行并保留调用轨迹。',
    icon: 'sparkles',
    path: '/app/agent-platform',
    access: 'admin',
  },
];

const operations: FunctionalProduct[] = [
  {
    title: '配置中心',
    englishTitle: 'Versioned JSON delivery',
    description: '创建 JSON 草稿、发布不可变版本、回滚并通过接口拉取。',
    icon: 'database',
    path: '/app/config-center',
    access: 'admin',
  },
  {
    title: '博客工作台',
    englishTitle: 'AI Blog Studio',
    description: '从主题和知识库生成文章，审阅后发布到博客仓库。',
    icon: 'note',
    path: '/app/blog-studio',
    access: 'admin',
  },
];

const authHref = (redirect: string) => {
  const login =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:5183/#/login'
      : `${window.location.origin}/auth-app/#/login`;
  return `${login}?redirect=${encodeURIComponent(new URL(redirect, window.location.origin).toString())}`;
};

export default function ProductLab() {
  const { user } = useUser();
  const [providers, setProviders] = useState<AuthProviderStatus | null>(null);
  const [agentCapabilities, setAgentCapabilities] = useState<unknown>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [agentStatusError, setAgentStatusError] = useState<string | null>(null);

  useEffect(() => {
    document.title = '产品工作台 · 光域';
    authSecurityService
      .providers()
      .then(setProviders)
      .catch((error) => setProviderStatusError(error instanceof Error ? error.message : String(error)));
    if (user) {
      agentPlatformService
        .capabilities()
        .then(setAgentCapabilities)
        .catch((error) => setAgentStatusError(error instanceof Error ? error.message : String(error)));
    }
  }, [user]);

  const renderProduct = (product: FunctionalProduct) => {
    const requiresLogin = product.access !== 'public' && !user;
    return (
      <article className={styles.card} key={product.path}>
        <div className={styles.cardIcon}>
          <AppIcon name={product.icon} size={22} />
        </div>
        <div className={styles.cardCopy}>
          <span>{product.englishTitle}</span>
          <h2>{product.title}</h2>
          <p>{product.description}</p>
          <small>access: {product.access}</small>
        </div>
        {requiresLogin ? (
          <a className={styles.action} href={authHref(product.path)}>
            登录后使用
          </a>
        ) : (
          <SafeAppLink className={styles.action} to={product.path}>
            打开功能
          </SafeAppLink>
        )}
      </article>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>LIGHTSPACE / FUNCTIONAL WORKBENCH</p>
          <h1>产品工作台</h1>
          <span>这里不再展示构想路线图，只提供已经接入系统、可以实际操作的功能入口和后端状态。</span>
        </div>
        <a href="https://github.com/zxkws/product-ideas" target="_blank" rel="noreferrer">
          查看原始需求
        </a>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p>PRODUCT APPLICATIONS</p>
          <h2>已落地产品</h2>
        </div>
        <div className={styles.grid}>{products.map(renderProduct)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p>OPERATIONS</p>
          <h2>后台工作流</h2>
        </div>
        <div className={styles.grid}>{operations.map(renderProduct)}</div>
      </section>

      <section className={styles.runtime}>
        <article>
          <h2>Auth provider state</h2>
          <pre>{providerStatusError ?? (providers === null ? 'loading' : JSON.stringify(providers, null, 2))}</pre>
        </article>
        <article>
          <h2>Agent capability state</h2>
          <pre>
            {user
              ? (agentStatusError ??
                (agentCapabilities === null ? 'loading' : JSON.stringify(agentCapabilities, null, 2)))
              : '登录后读取'}
          </pre>
        </article>
      </section>
    </div>
  );
}
