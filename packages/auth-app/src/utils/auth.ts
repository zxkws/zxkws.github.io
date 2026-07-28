import { API_BASE } from '../config';
export type OAuthProvider = 'github' | 'google' | 'wechat' | 'alipay';

export const initiateOAuthLogin = (provider: OAuthProvider) => {
  const callback = new URL(window.location.href);
  callback.searchParams.delete('auth_code');
  callback.searchParams.delete('bound');
  const target = `${API_BASE}/auth/${provider}?redirect=${encodeURIComponent(callback.toString())}`;
  window.location.href = target;
};
