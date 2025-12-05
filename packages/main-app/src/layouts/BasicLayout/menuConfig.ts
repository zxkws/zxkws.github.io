import type { MenuItem } from '../../types/menu';

// 前端内置公共菜单
// 未登录可见：主页、文本对比、Curl Converter
// 登录且管理员可见：其余业务菜单
export const builtInAsideMenus: MenuItem[] = [
  { name: '首页', path: '/' },
  { name: '文本对比', path: '/textdiff' },
  { name: 'Curl Converter', path: '/curlconverter' },
  { name: '知识中台', path: '/app/knowledge-hub', adminOnly: true },
  { name: 'PDF 编辑器', path: '/app/pdf-editor', adminOnly: true },
  { name: '模型对话', path: '/app/codex-chat', adminOnly: true },
  { name: '配置中心', path: '/app/config-hub', adminOnly: true },
  { name: '数据库管控', path: '/app/db-ops', adminOnly: true },
];
