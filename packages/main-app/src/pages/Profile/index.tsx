import { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { isValidEmail } from '../../utils/validators';

type Me = {
  userId: string;
  username: string;
  email?: string;
  role?: string;
};

export default function Profile() {
  const { user, refreshUser, saveUser } = useUser();
  const [me, setMe] = useState<Me | null>(() => (user as Me | null) ?? null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      if (user) {
        setMe(user as Me);
        setEmail(user.email ?? '');
        return;
      }
      const next = await refreshUser().catch(() => null);
      if (mounted && next) {
        setMe(next as Me);
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
      const updated = await saveUser({ email: email || undefined, password: password || undefined });
      setMe((updated as Me) ?? null);
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
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header>
        <h1 className="text-xl font-semibold">个人资料</h1>
        <p className="text-sm text-[var(--color-muted)]">查看并更新你的账号信息</p>
      </header>
      {msg && <div className="rounded border border-[var(--header-border)] bg-[var(--card-bg)] px-3 py-2">{msg}</div>}
      <div className="flex flex-col gap-3 max-w-xl">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-muted)]">用户名</span>
          <input
            disabled
            value={me?.username ?? ''}
            className="rounded border border-[var(--header-border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-muted)]">邮箱</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-[var(--header-border)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-muted)]">新密码（可选，留空不改）</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-[var(--header-border)] bg-transparent px-3 py-2"
          />
        </label>
        <button
          className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60"
          onClick={save}
          disabled={loading}
        >
          {loading ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
