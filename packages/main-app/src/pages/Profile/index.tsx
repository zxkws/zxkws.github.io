import { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import type { UserProfile } from '../../services/userService';
import { isValidEmail } from '../../utils/validators';

export default function Profile() {
  const { user, refreshUser, saveUser } = useUser();
  const [me, setMe] = useState<UserProfile | null>(() => user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      if (user) {
        setMe(user);
        setEmail(user.email ?? '');
        return;
      }
      const next = await refreshUser().catch(() => null);
      if (mounted && next) {
        setMe(next);
        setEmail(next.email ?? '');
      }
    };
    sync();
    return () => {
      mounted = false;
    };
  }, [user, refreshUser]);

  const save = async () => {
    setLoading(true);
    setMsg(null);
    try {
      if (!isValidEmail(email)) {
        throw new Error('请输入有效邮箱地址，例如 name@example.com');
      }
      const updated = await saveUser({
        email: email || undefined,
        password: password || undefined,
      });
      setMe(updated);
      setEmail(updated?.email ?? '');
      setPassword('');
      setMsg('更新成功');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Account settings</p>
          <h1>个人资料</h1>
          <p className="workspace-page__description">查看当前账号，并更新邮箱或登录密码。</p>
        </div>
      </header>

      {msg && (
        <output className={`workspace-feedback${msg === '更新成功' ? '' : ' workspace-feedback--error'}`}>{msg}</output>
      )}

      <section className="workspace-panel">
        <div className="workspace-panel__header">
          <div>
            <h2>账号信息</h2>
            <p className="workspace-panel__meta">用户名由系统管理，邮箱和密码可以在这里更新。</p>
          </div>
        </div>
        <div className="workspace-form">
          <label className="workspace-field">
            <span>用户名</span>
            <input disabled value={me?.username ?? ''} className="workspace-input" />
          </label>
          <label className="workspace-field">
            <span>邮箱</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="workspace-input"
            />
          </label>
          <label className="workspace-field">
            <span>新密码（留空则不修改）</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="workspace-input"
            />
          </label>
          <div className="workspace-inline-actions">
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={save}
              disabled={loading}
            >
              {loading ? '保存中…' : '保存修改'}
            </button>
          </div>
        </div>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel__header">
          <div>
            <h2>服务端资料</h2>
            <p className="workspace-panel__meta">以下字段保持接口返回值原样展示。</p>
          </div>
        </div>
        <dl className="workspace-data-list">
          <div>
            <dt>id</dt>
            <dd>{me?.id}</dd>
          </div>
          <div>
            <dt>userId</dt>
            <dd>{me?.userId}</dd>
          </div>
          <div>
            <dt>username</dt>
            <dd>{me?.username}</dd>
          </div>
          <div>
            <dt>email</dt>
            <dd>{me?.email}</dd>
          </div>
          <div>
            <dt>avatar</dt>
            <dd>{me?.avatar}</dd>
          </div>
          <div>
            <dt>role</dt>
            <dd>{me?.role}</dd>
          </div>
          <div>
            <dt>roles</dt>
            <dd className="workspace-value-list">
              {me?.roles?.map((role) => (
                <span key={role}>{role}</span>
              ))}
            </dd>
          </div>
          <div>
            <dt>permissions</dt>
            <dd className="workspace-value-list">
              {me?.permissions?.map((permission) => (
                <span key={permission}>{permission}</span>
              ))}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
