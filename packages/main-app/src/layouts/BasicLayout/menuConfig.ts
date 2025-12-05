import type { MenuItem } from '../../types/menu';

// 前端内置公共菜单
export const builtInAsideMenus: MenuItem[] = [
  { name: '首页', path: '/' },
  {
    name: 'Vue 应用',
    path: '/v-app',
    children: [
      { name: '导航列表', path: '/v-app/navList' },
      { name: 'Todo', path: '/v-app/todo' },
      { name: '账户管理', path: '/v-app/account' },
      { name: 'LLM 排名', path: '/v-app/llm-ranking' },
    ],
  },
  { name: '知识中台', path: '/app/knowledge-hub' },
  { name: 'PDF 编辑器', path: '/app/pdf-editor' },
  { name: '个人简历', path: '/app/person-resume' },
  { name: '模型对话', path: '/app/codex-chat' },
  { name: '文本对比', path: '/textdiff' },
  { name: 'Curl Converter', path: '/curlconverter' },
  { name: '配置中心', path: '/app/config-hub' },
  { name: '数据库管控', path: '/app/db-ops' },
];

export const headerMenuConfig: MenuItem[] = [];
