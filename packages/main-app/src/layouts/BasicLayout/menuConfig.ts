import type { MenuItem } from '../../types/menu';

// 前端内置公共菜单
// 未登录可见：主页、文本对比、Curl Converter
// 登录后：后端返回为准；此处作为兜底
export const builtInAsideMenus: MenuItem[] = [
  { name: '首页', path: '/' },
  // 注意：/textdiff/ 是子应用的静态目录（独立站）。主应用内嵌用 /tools/textdiff，避免刷新时被静态目录劫持。
  { name: '文本对比', path: '/tools/textdiff' },
  { name: 'Curl Converter', path: '/tools/curlconverter' },
  // 业务菜单仅为兜底；实际显示以后端返回为准
  { name: '知识中台', path: '/v-react/knowledge-hub' },
  { name: 'PDF 编辑器', path: '/v-react/pdf-editor' },
  { name: '模型对话', path: '/v-react/codex-chat' },
  { name: '智能代理', path: '/app/agent-tasks' },
  { name: '数据库管控', path: '/v-react/db-ops' },
  { name: '权限管理', path: '/app/permission-admin' },
  { name: '用户管理', path: '/app/user-admin' },
  { name: 'Obsidian 笔记', path: '/v-react/notes' },
  { name: '导航列表', path: '/v-app/navList' },
  { name: '代办', path: '/v-app/todo' },
  { name: '账号管理', path: '/v-app/account' },
  { name: 'LLM 排行', path: '/v-app/llm-ranking' },
];
