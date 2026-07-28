import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  type AuthProviderStatus,
  authSecurityService,
  type LoginAudit,
  type OAuthProvider,
  type UserIdentity,
} from '../../services/authSecurityService';
import '../studio.css';

const providerNames: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
  wechat: '微信',
  alipay: '支付宝',
};

export default function SecurityCenter() {
  const [providers, setProviders] = useState<AuthProviderStatus | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [audits, setAudits] = useState<LoginAudit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [providerData, identityData, auditData] = await Promise.all([
        authSecurityService.providers(),
        authSecurityService.identities(),
        authSecurityService.audits(),
      ]);
      setProviders(providerData);
      setIdentities(identityData);
      setAudits(auditData);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '安全中心加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '身份与安全 · 光域';
    const bound = new URLSearchParams(window.location.search).get('bound');
    if (bound) message.success(`${bound} 身份已绑定`);
    load();
  }, []);

  const unbind = async (identity: UserIdentity) => {
    if (!window.confirm(`确认解绑 ${providerNames[identity.provider]} 身份？`)) return;
    try {
      await authSecurityService.unbind(identity.id);
      await load();
      message.success('身份已解绑');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '身份解绑失败');
    }
  };

  const bind = (provider: OAuthProvider) => {
    window.location.href = authSecurityService.bindingUrl(provider);
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Identity & security</p>
          <h1>身份与安全</h1>
          <p className="workspace-page__description">
            管理统一账号下的第三方身份，查看真实登录记录；未配置密钥的登录提供商不会开放入口。
          </p>
        </div>
        <button type="button" className="workspace-button" onClick={load} disabled={loading}>
          刷新
        </button>
      </header>

      <section className="workspace-panel">
        <div className="workspace-panel__header">
          <div>
            <h2>登录提供商</h2>
            <p className="workspace-panel__meta">
              password: {String(providers?.password)} · sms: {String(providers?.sms)}
            </p>
          </div>
        </div>
        <div className="security-provider-grid">
          {(Object.keys(providerNames) as OAuthProvider[]).map((provider) => {
            const identity = identities.find((item) => item.provider === provider);
            const enabled = providers?.[provider] === true;
            return (
              <article className="security-provider" key={provider}>
                <div>
                  <strong>{providerNames[provider]}</strong>
                  <span>configured: {String(enabled)}</span>
                  <span>bound: {String(Boolean(identity))}</span>
                </div>
                {identity ? (
                  <button
                    type="button"
                    className="workspace-button workspace-button--danger"
                    onClick={() => unbind(identity)}
                  >
                    解绑
                  </button>
                ) : (
                  <button
                    type="button"
                    className="workspace-button workspace-button--primary"
                    onClick={() => bind(provider)}
                    disabled={!enabled}
                  >
                    绑定
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="workspace-panel workspace-panel--flush">
        <div className="studio-table-heading">
          <h2>已绑定身份</h2>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>provider</th>
                <th>subject</th>
                <th>displayName</th>
                <th>email</th>
                <th>lastLoginAt</th>
                <th>createdAt</th>
              </tr>
            </thead>
            <tbody>
              {identities.map((identity) => (
                <tr key={identity.id}>
                  <td className="workspace-table__primary">{identity.provider}</td>
                  <td className="workspace-code">{identity.subject}</td>
                  <td>{identity.displayName}</td>
                  <td>{identity.email}</td>
                  <td>{identity.lastLoginAt}</td>
                  <td>{identity.createdAt}</td>
                </tr>
              ))}
              {!identities.length && (
                <tr>
                  <td colSpan={6} className="workspace-empty">
                    暂无第三方身份
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="workspace-panel workspace-panel--flush">
        <div className="studio-table-heading">
          <h2>登录审计</h2>
        </div>
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>provider</th>
                <th>status</th>
                <th>ip</th>
                <th>userAgent</th>
                <th>reason</th>
                <th>createdAt</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td className="workspace-table__primary">{audit.provider}</td>
                  <td>{audit.status}</td>
                  <td>{audit.ip}</td>
                  <td>{audit.userAgent}</td>
                  <td>{audit.reason}</td>
                  <td>{audit.createdAt}</td>
                </tr>
              ))}
              {!audits.length && (
                <tr>
                  <td colSpan={6} className="workspace-empty">
                    暂无登录记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
