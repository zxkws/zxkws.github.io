import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'zh-CN' | 'en-US';

const STORAGE_KEY = 'lightspace-language';

const messages: Record<Language, Record<string, string>> = {
  'zh-CN': {
    'common.loading': '正在加载…',
    'common.close': '关闭',
    'common.reload': '刷新页面',
    'common.clearCacheReload': '清理缓存并刷新',
    'common.retry': '刷新重试',
    'common.loginRequired': '登录后读取',
    'common.refresh': '刷新',
    'common.refreshing': '刷新中…',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.saving': '保存中…',
    'home.description': '一个属于创造、记录与探索的数字空间。',
    'home.enter': '进入系统',
    'home.login': '登录系统',
    'header.openMenu': '打开工作台菜单',
    'header.search': '搜索',
    'header.switchToLight': '切换到浅色主题',
    'header.switchToDark': '切换到深色主题',
    'header.switchToChinese': '切换到中文',
    'header.switchToEnglish': 'Switch to English',
    'header.profile': '个人资料',
    'header.about': '关于系统',
    'header.clearCache': '清理缓存',
    'header.logout': '退出登录',
    'header.loginAdmin': '登录后台',
    'header.frontendBuildTime': '前端构建时间',
    'header.backendDeployTime': '后端部署时间',
    'header.systemVersion': '系统版本',
    'header.fetchFailed': '获取失败',
    'nav.workspace': '工作台',
    'nav.quickJump': '快速跳转',
    'nav.closeMenu': '关闭工作台菜单',
    'nav.features': '工作台功能',
    'command.close': '关闭命令面板',
    'command.label': '命令面板',
    'command.placeholder': '搜索功能或输入路径…',
    'command.empty': '没有匹配结果',
    'contact.open': '联系客服',
    'contact.closeWindow': '关闭客服窗口',
    'contact.sentTitle': '问题已经发送',
    'contact.sentDescription': '我会通过你留下的邮箱回复。',
    'contact.acknowledge': '知道了',
    'contact.description': '留下你的问题和邮箱，我会尽快回复。',
    'contact.email': '邮箱',
    'contact.message': '问题',
    'contact.messagePlaceholder': '请描述你遇到的问题或想了解的内容',
    'contact.company': '公司',
    'contact.sending': '正在发送…',
    'contact.submit': '发送问题',
    'contact.sendFailed': '发送失败，请稍后再试',
    'error.notFoundTitle': '没有找到这个页面',
    'error.notFoundDescription': '当前地址没有匹配到可用功能，请返回门户重新选择入口。',
    'error.backPortal': '返回门户',
    'error.configTitle': '无法加载应用配置',
    'error.runtimeTitle': '页面暂时无法使用',
    'error.runtimeFallback': '抱歉，系统出现了异常。',
    'error.cacheConfirm': '可能是旧版本缓存导致异常，是否清理缓存并刷新？（会导致离线缓存失效）',
    'update.confirm': '检测到新版本，是否立即刷新体验？',
    'menu.navigation': '导航列表',
    'menu.productLab': '产品工作台',
    'menu.chessMirror': '象棋·镜',
    'menu.textDiff': '文本对比',
    'menu.jsonTool': 'JSON 工具',
    'menu.blog': '博客',
    'menu.pdfEditor': 'PDF 编辑器',
    'menu.watchTogether': '一起看',
    'menu.databaseOps': '数据库管控',
    'menu.assistants': '语音助手',
    'menu.knowledgeBases': '知识库',
    'menu.aiAdmin': 'AI 模型配置',
    'menu.modelPlayground': '模型调试',
    'menu.menuAdmin': '菜单管理',
    'menu.roleAdmin': '角色管理',
    'menu.permissionAdmin': '权限管理',
    'menu.userAdmin': '用户管理',
    'menu.configCenter': '配置中心',
    'menu.blogStudio': '博客工作台',
    'menu.securityCenter': '身份与安全',
    'menu.agentPlatform': 'Agent 平台',
    'menu.notes': 'Obsidian 笔记',
    'menu.keepalive': '定时轮询保活',
    'menu.payment': '支付',
    'menu.todo': '待办',
    'navigation.eyebrow': 'Link directory',
    'navigation.title': '导航列表',
    'navigation.description': '集中保存常用网站和工具地址，支持搜索、分类以及后台维护。',
    'navigation.count': '共 {count} 项',
    'navigation.search': '搜索名称、地址或分类',
    'navigation.create': '新增导航',
    'navigation.loading': '正在加载导航…',
    'navigation.empty': '暂无导航项',
    'navigation.noMatch': '没有匹配的导航项',
    'navigation.loadFailed': '导航加载失败',
    'navigation.created': '导航项已新增',
    'navigation.updated': '导航项已更新',
    'navigation.saveFailed': '导航项保存失败',
    'navigation.deleted': '导航项已删除',
    'navigation.deleteFailed': '导航项删除失败',
    'navigation.deleteConfirm': '确定删除“{name}”吗？',
    'navigation.createTitle': '新增导航项',
    'navigation.editTitle': '编辑导航项',
    'navigation.name': '名称',
    'navigation.nameRequired': '请输入名称',
    'navigation.url': '地址',
    'navigation.urlRequired': '请输入地址',
    'navigation.category': '分类',
    'navigation.sort': '排序',
  },
  'en-US': {
    'common.loading': 'Loading…',
    'common.close': 'Close',
    'common.reload': 'Reload page',
    'common.clearCacheReload': 'Clear cache and reload',
    'common.retry': 'Try again',
    'common.loginRequired': 'Sign in to load',
    'common.refresh': 'Refresh',
    'common.refreshing': 'Refreshing…',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.saving': 'Saving…',
    'home.description': 'A digital space for creating, documenting, and exploring.',
    'home.enter': 'Open console',
    'home.login': 'Sign in',
    'header.openMenu': 'Open workspace menu',
    'header.search': 'Search',
    'header.switchToLight': 'Switch to light theme',
    'header.switchToDark': 'Switch to dark theme',
    'header.switchToChinese': '切换到中文',
    'header.switchToEnglish': 'Switch to English',
    'header.profile': 'Profile',
    'header.about': 'About',
    'header.clearCache': 'Clear cache',
    'header.logout': 'Sign out',
    'header.loginAdmin': 'Admin sign in',
    'header.frontendBuildTime': 'Frontend build',
    'header.backendDeployTime': 'Backend deployment',
    'header.systemVersion': 'System version',
    'header.fetchFailed': 'Failed to load',
    'nav.workspace': 'Workspace',
    'nav.quickJump': 'Quick jump',
    'nav.closeMenu': 'Close workspace menu',
    'nav.features': 'Workspace features',
    'command.close': 'Close command palette',
    'command.label': 'Command palette',
    'command.placeholder': 'Search features or enter a path…',
    'command.empty': 'No matching results',
    'contact.open': 'Contact support',
    'contact.closeWindow': 'Close support window',
    'contact.sentTitle': 'Message sent',
    'contact.sentDescription': 'I will reply to the email address you provided.',
    'contact.acknowledge': 'Done',
    'contact.description': 'Leave your question and email address, and I will reply as soon as possible.',
    'contact.email': 'Email',
    'contact.message': 'Question',
    'contact.messagePlaceholder': 'Describe your question or what you would like to know',
    'contact.company': 'Company',
    'contact.sending': 'Sending…',
    'contact.submit': 'Send message',
    'contact.sendFailed': 'Unable to send. Please try again later.',
    'error.notFoundTitle': 'Page not found',
    'error.notFoundDescription': 'This address does not match an available feature. Return to the portal to continue.',
    'error.backPortal': 'Back to portal',
    'error.configTitle': 'Unable to load application configuration',
    'error.runtimeTitle': 'This page is temporarily unavailable',
    'error.runtimeFallback': 'Sorry, something went wrong.',
    'error.cacheConfirm': 'Cached files may be causing this error. Clear the offline cache and reload?',
    'update.confirm': 'A new version is available. Reload now?',
    'menu.navigation': 'Navigation',
    'menu.productLab': 'Product workspace',
    'menu.chessMirror': 'Chess Mirror',
    'menu.textDiff': 'Text comparison',
    'menu.jsonTool': 'JSON tool',
    'menu.blog': 'Blog',
    'menu.pdfEditor': 'PDF editor',
    'menu.watchTogether': 'Watch Together',
    'menu.databaseOps': 'Database operations',
    'menu.assistants': 'Voice assistants',
    'menu.knowledgeBases': 'Knowledge bases',
    'menu.aiAdmin': 'AI model settings',
    'menu.modelPlayground': 'Model playground',
    'menu.menuAdmin': 'Menu management',
    'menu.roleAdmin': 'Role management',
    'menu.permissionAdmin': 'Permission management',
    'menu.userAdmin': 'User management',
    'menu.configCenter': 'Configuration center',
    'menu.blogStudio': 'Blog studio',
    'menu.securityCenter': 'Identity & security',
    'menu.agentPlatform': 'Agent platform',
    'menu.notes': 'Obsidian notes',
    'menu.keepalive': 'Keepalive polling',
    'menu.payment': 'Payments',
    'menu.todo': 'Todo',
    'navigation.eyebrow': 'Link directory',
    'navigation.title': 'Navigation',
    'navigation.description':
      'Keep frequently used websites and tools together, with search, categories, and admin editing.',
    'navigation.count': '{count} items',
    'navigation.search': 'Search name, address, or category',
    'navigation.create': 'Add link',
    'navigation.loading': 'Loading navigation…',
    'navigation.empty': 'No links yet',
    'navigation.noMatch': 'No matching links',
    'navigation.loadFailed': 'Unable to load navigation',
    'navigation.created': 'Link added',
    'navigation.updated': 'Link updated',
    'navigation.saveFailed': 'Unable to save link',
    'navigation.deleted': 'Link deleted',
    'navigation.deleteFailed': 'Unable to delete link',
    'navigation.deleteConfirm': 'Delete “{name}”?',
    'navigation.createTitle': 'Add link',
    'navigation.editTitle': 'Edit link',
    'navigation.name': 'Name',
    'navigation.nameRequired': 'Enter a name',
    'navigation.url': 'Address',
    'navigation.urlRequired': 'Enter an address',
    'navigation.category': 'Category',
    'navigation.sort': 'Order',
  },
};

export const readLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en-US') return stored;
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en-US';
};

const interpolate = (message: string, values?: Record<string, string | number>) => {
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
};

export const translate = (language: Language, key: string, values?: Record<string, string | number>) =>
  interpolate(messages[language][key] ?? messages['zh-CN'][key] ?? key, values);

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(readLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    window.localStorage.setItem(STORAGE_KEY, language);
    (window as typeof window & { __LIGHTSPACE_LANGUAGE__?: Language }).__LIGHTSPACE_LANGUAGE__ = language;
    window.dispatchEvent(new CustomEvent('lightspace:language-change', { detail: language }));
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === 'zh-CN' ? 'en-US' : 'zh-CN'));
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => translate(language, key, values),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, t, toggleLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
