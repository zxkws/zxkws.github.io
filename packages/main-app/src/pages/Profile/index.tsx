import { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import type { UserProfile } from '../../services/userService';
import { isValidEmail } from '../../utils/validators';

export default function Profile() {
  const { user, refreshUser, saveUser } = useUser();
  const [me, setMe] = useState<UserProfile | null>(() => user);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      if (newPassword) {
        if (!currentPassword) throw new Error('修改密码时请输入当前密码');
        if (newPassword.length < 10) throw new Error('新密码至少 10 位');
        if (newPassword !== confirmPassword) throw new Error('两次输入的新密码不一致');
      }
      const updated = await saveUser({
        email: email || undefined,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
      });
      setMe(updated);
      setEmail(updated?.email ?? '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
            <span>当前密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="workspace-input"
              placeholder="仅修改密码时填写"
            />
          </label>
          <label className="workspace-field">
            <span>新密码（留空则不修改）</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="workspace-input"
            />
          </label>
          <label className="workspace-field">
            <span>确认新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
