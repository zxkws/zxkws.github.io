import menusFile from '../config/menus.json';
import type { MenuItem } from '../types/menu';
import { client } from './httpClient';

const unwrapData = (payload: unknown): unknown =>
  payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;

const menuPathAliases: Record<string, string> = {
  '/textdiff': '/v-app/text-difference',
  '/tools/textdiff': '/v-app/text-difference',
  '/curlconverter': '/tools/curlconverter',
  '/config-hub': '/app/config-center',
  '/app/config-hub': '/app/config-center',
  '/app/db-ops': '/v-react/db-ops',
  '/app/knowledge-hub': '/v-react/knowledge-bases',
  '/v-react/knowledge-hub': '/v-react/knowledge-bases',
  '/app/codex-chat': '/v-react/model-playground',
  '/v-react/codex-chat': '/v-react/model-playground',
  '/app/agent-tasks': '/app/agent-platform',
  '/app/v-react': '/v-react/notes',
  '/v-app/navList': '/app/navigation',
  '/pdf-editor': 'https://pdf.acckm.com',
  '/app/pdf-editor': 'https://pdf.acckm.com',
  '/v-react/pdf-editor': 'https://pdf.acckm.com',
};

const retiredMenuPaths = new Set(['/', '/v-app/account', '/v-app/llm-ranking']);

const menuTranslationKeys: Record<string, string> = {
  '/app/navigation': 'menu.navigation',
  '/product-lab': 'menu.productLab',
  '/chess-mirror': 'menu.chessMirror',
  '/v-app/text-difference': 'menu.textDiff',
  '/v-app/json-viewer': 'menu.jsonTool',
  'https://blog.acckm.com': 'menu.blog',
  'https://pdf.acckm.com': 'menu.pdfEditor',
  '/app/watch-together': 'menu.watchTogether',
  '/v-react/db-ops': 'menu.databaseOps',
  '/v-react/assistants': 'menu.assistants',
  '/v-react/knowledge-bases': 'menu.knowledgeBases',
  '/v-react/ai-admin': 'menu.aiAdmin',
  '/v-react/model-playground': 'menu.modelPlayground',
  '/app/menu-admin': 'menu.menuAdmin',
  '/app/role-admin': 'menu.roleAdmin',
  '/app/permission-admin': 'menu.permissionAdmin',
  '/app/user-admin': 'menu.userAdmin',
  '/app/config-center': 'menu.configCenter',
  '/app/blog-studio': 'menu.blogStudio',
  '/app/security-center': 'menu.securityCenter',
  '/app/agent-platform': 'menu.agentPlatform',
  '/v-react/notes': 'menu.notes',
  '/v-react/keepalive': 'menu.keepalive',
  '/v-app/payment': 'menu.payment',
  '/v-app/todo': 'menu.todo',
};

export const resolveMenuPath = (path?: string) => {
  if (!path) return path;
  if (retiredMenuPaths.has(path)) return null;
  return menuPathAliases[path] ?? path;
};

const normalizeMenus = (list: unknown): MenuItem[] => {
  if (!Array.isArray(list)) return [];

  return list.flatMap((item): MenuItem[] => {
    const m = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    const rawChildren = (m as { children?: unknown }).children;
    const children = Array.isArray(rawChildren) && rawChildren.length > 0 ? normalizeMenus(rawChildren) : undefined;

    const name = typeof m.title === 'string' ? m.title : typeof m.name === 'string' ? m.name : '';
    const rawPath = typeof m.path === 'string' ? m.path : undefined;
    const path = resolveMenuPath(rawPath);
    if (path === null) return [];

    return [
      {
        name,
        path,
        icon: typeof m.icon === 'string' ? m.icon : undefined,
        external: path?.startsWith('http://') || path?.startsWith('https://') ? true : m.external === true,
        order: typeof m.order === 'number' ? m.order : 0,
        visible: m.visible !== false,
        permission: typeof m.permission === 'string' ? m.permission : null,
        adminOnly: m.adminOnly === true,
        requiresAuth: m.requiresAuth === true,
        i18nKey: path ? menuTranslationKeys[path] : undefined,
        children,
      },
    ];
  });
};

/**
 * 未登录使用打包菜单；登录后优先使用角色在后台获配的菜单。
 */
export async function fetchRemoteMenus(authenticated: boolean): Promise<MenuItem[]> {
  if (authenticated) {
    const payload = await client<unknown>('/v1/user/menus', {}, { method: 'GET' });
    const remote = normalizeMenus(unwrapData(payload));
    if (remote.length) return remote;
  }
  const list = menusFile as unknown;
  return normalizeMenus(list);
}
