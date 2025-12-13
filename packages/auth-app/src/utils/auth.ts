import { API_BASE } from '../config';
import { resolveRedirectUrl } from './redirect';
import type { LocationQueryValue } from 'vue-router';

export const initiateGithubLogin = (redirectQuery: LocationQueryValue | LocationQueryValue[]) => {
  const redirect = resolveRedirectUrl(redirectQuery).toString();
  const target = `${API_BASE}/auth/github?redirect=${encodeURIComponent(redirect)}`;
  window.location.href = target;
};
