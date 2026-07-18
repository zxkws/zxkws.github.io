import type { MenuItem } from '../../types/menu';

// 前端内置公共菜单
// 未登录可见：主页、文本对比、Curl Converter
// 登录后：后端返回为准；此处作为兜底
export const builtInAsideMenus: MenuItem[] = [
  { name: '首页', path: '/' },
  { name: '象棋·镜', path: '/chess-mirror' },
  { name: '文本对比', path: '/v-app/text-difference' },
  { name: 'JSON 工具', path: '/v-app/json-viewer' },
  { name: 'Curl Converter', path: '/tools/curlconverter' },
  // 业务菜单仅为兜底；实际显示以后端返回为准
  { name: '一起看', path: '/app/watch-together' },
  { name: '数据库管控', path: '/v-react/db-ops' },
  { name: '权限管理', path: '/app/permission-admin' },
  { name: '用户管理', path: '/app/user-admin' },
  { name: 'Obsidian 笔记', path: '/v-react/notes' },
  { name: '定时轮询保活', path: '/v-react/keepalive' },
  { name: '导航列表', path: '/v-app/navList' },
  { name: '代办', path: '/v-app/todo' },
  { name: '账号管理', path: '/v-app/account' },
];
