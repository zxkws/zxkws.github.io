import type { MenuItem } from '../../types/menu';

// 前端内置公共菜单
// 未登录可见：主页、文本对比、Curl Converter
// 登录后：后端返回为准；此处作为兜底
export const builtInAsideMenus: MenuItem[] = [
  { name: '首页', path: '/' },
  { name: '产品工作台', path: '/product-lab' },
  { name: '象棋·镜', path: '/chess-mirror' },
  { name: '文本对比', path: '/v-app/text-difference' },
  { name: 'JSON 工具', path: '/v-app/json-viewer' },
  { name: 'Curl Converter', path: '/tools/curlconverter' },
  // 业务菜单仅为兜底；实际显示以后端返回为准
  { name: '一起看', path: '/app/watch-together' },
  { name: '数据库管控', path: '/v-react/db-ops', requiresAuth: true },
  { name: '语音助手', path: '/v-react/assistants', requiresAuth: true },
  { name: '知识库', path: '/v-react/knowledge-bases', requiresAuth: true },
  { name: 'AI 模型配置', path: '/v-react/ai-admin', requiresAuth: true, adminOnly: true },
  { name: '模型调试', path: '/v-react/model-playground', requiresAuth: true, adminOnly: true },
  { name: '菜单管理', path: '/app/menu-admin', requiresAuth: true, adminOnly: true },
  { name: '角色管理', path: '/app/role-admin', requiresAuth: true, adminOnly: true },
  { name: '权限管理', path: '/app/permission-admin', requiresAuth: true, adminOnly: true },
  { name: '用户管理', path: '/app/user-admin', requiresAuth: true, adminOnly: true },
  { name: '配置中心', path: '/app/config-center', requiresAuth: true, adminOnly: true },
  { name: '博客工作台', path: '/app/blog-studio', requiresAuth: true, adminOnly: true },
  { name: '身份与安全', path: '/app/security-center', requiresAuth: true },
  { name: 'Agent 平台', path: '/app/agent-platform', requiresAuth: true, adminOnly: true },
  { name: 'Obsidian 笔记', path: '/v-react/notes', requiresAuth: true },
  { name: '定时轮询保活', path: '/v-react/keepalive', requiresAuth: true },
  { name: '支付', path: '/v-app/payment', requiresAuth: true },
  { name: '待办', path: '/v-app/todo', requiresAuth: true },
];
