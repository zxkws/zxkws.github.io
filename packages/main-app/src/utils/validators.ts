// Reusable validators shared across main app & potential micro apps.

/**
 * RFC5322 简化版邮箱校验，允许空字符串（表示不修改）。
 * 限制最大长度 254，避免过长输入。
 */
export const isValidEmail = (email?: string | null): boolean => {
  if (!email) return true; // 允许留空表示不更新
  if (email.length > 254) return false;
  const regex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return regex.test(email.trim());
};
