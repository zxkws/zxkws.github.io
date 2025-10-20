# 微前端配置化系统设计

## 核心理念

将微应用的注册、菜单、权限等都做成可配置项，通过配置中心动态管理。

## 数据结构设计

### 1. 微应用配置

```typescript
interface MicroAppConfig {
  id: string; // 唯一标识
  name: string; // 应用名称（用于 ice-stark）
  displayName: string; // 显示名称
  description?: string; // 描述

  // 加载配置
  entry: string; // 入口 URL
  activeRule: string[]; // 激活规则（路径匹配）

  // 环境配置
  devEntry?: string; // 开发环境入口
  prodEntry?: string; // 生产环境入口

  // 加载选项
  sandbox?: boolean; // 是否启用沙箱
  loadScriptMode?: 'fetch' | 'script' | 'import'; // 脚本加载模式

  renderType?: 'microfront' | 'iframe'; // 渲染方式

  // 状态
  enabled: boolean; // 是否启用
  version?: string; // 版本号

  // 菜单配置（基础入口）
  menu?: MenuConfig; // 关联的菜单配置

  // iframe 模式（true 表示主应用通过 iframe 渲染该微应用）

  // 权限
  permissions?: string[]; // 需要的权限
  roles?: string[]; // 允许的角色

  // 元信息
  icon?: string; // 图标
  order?: number; // 排序
  tags?: string[]; // 标签

  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 菜单配置

#### 方案 A：菜单与微应用绑定（推荐）

```typescript
interface MenuConfig {
  id: string;

  // 关联微应用（可选）
  microAppId?: string; // 关联的微应用 ID

  // 菜单基本信息
  name: string; // 菜单名称
  path?: string; // 路径
  icon?: string; // 图标

  // 菜单类型
  type: 'group' | 'item' | 'link' | 'external';

  // 层级结构
  parentId?: string; // 父菜单 ID
  children?: MenuConfig[]; // 子菜单

  // 显示控制
  visible: boolean; // 是否可见
  disabled?: boolean; // 是否禁用

  // 权限
  permissions?: string[]; // 需要的权限
  roles?: string[]; // 允许的角色

  // 外部链接
  externalUrl?: string; // 外部链接 URL
  openInNewTab?: boolean; // 是否新窗口打开

  // 附加信息
  badge?: string; // 徽章
  description?: string; // 描述
  order?: number; // 排序

  // 来源标识
  source: 'static' | 'dynamic' | 'micro-app';
  // static: 静态配置（配置中心）
  // dynamic: 动态菜单（如权限菜单）
  // micro-app: 微应用暴露的菜单
}
```

### 3. 完整配置结构

```typescript
interface SystemConfig {
  microApps: MicroAppConfig[]; // 微应用列表
  menus: MenuConfig[]; // 菜单列表
  version: string; // 配置版本
  updatedAt: Date; // 更新时间
}
```

## 配置策略对比

### 方案 A：菜单与微应用绑定（推荐）✅

**优势：**

- ✅ 配置简单，一处配置，多处生效
- ✅ 保证一致性（微应用和菜单不会不匹配）
- ✅ 易于维护
- ✅ 支持微应用自动注入子菜单

**结构：**

```typescript
{
  microApps: [
    {
      id: 'v-app',
      name: 'v-app',
      entry: '/v-app/',
      menu: {
        name: 'Vue 应用',
        icon: '⚡',
        children: [
          { name: '导航列表', path: '/v-app/navList' },
          { name: 'Todo', path: '/v-app/todo' },
        ],
      },
    },
  ];
}
```

## 配置管理工具

- `config-hub`：通用配置中心服务（开发入口 `http://localhost:5176`，生产入口 `https://zxkws.nyc.mn/config-hub/`），所有微应用配置均由该服务提供，主应用不再内置本地 fallback。

### 方案 B：菜单完全独立

**优势：**

- ✅ 灵活性高
- ✅ 可以创建不关联微应用的菜单
- ✅ 支持复杂的菜单组织

**劣势：**

- ❌ 配置复杂
- ❌ 容易出现菜单和微应用不匹配
- ❌ 维护成本高

**结构：**

```typescript
{
  microApps: [...],
  menus: [
    {
      id: 'menu-1',
      name: 'Vue 应用',
      children: [
        { name: '导航', path: '/v-app/nav', microAppId: 'v-app' },
        { name: 'Todo', path: '/v-app/todo', microAppId: 'v-app' },
      ]
    },
    {
      id: 'menu-2',
      name: '外部链接',
      type: 'external',
      externalUrl: 'https://example.com'
    }
  ]
}
```

### 推荐方案：混合模式

**结合两者优势：**

```typescript
interface MicroAppConfig {
  // ... 基础配置

  // 方式 1：简单绑定（自动生成菜单）
  menu?: {
    name: string;
    icon?: string;
    // 子菜单由微应用暴露
  };

  // 方式 2：完整配置（覆盖微应用暴露的菜单）
  menuOverride?: MenuConfig;
}

// 独立菜单（不关联微应用）
interface StandaloneMenu extends MenuConfig {
  microAppId?: never;
  // 如工具菜单、外部链接等
}

interface SystemConfig {
  microApps: MicroAppConfig[];
  standaloneMenus?: StandaloneMenu[]; // 独立菜单
}
```

## 工作流程

### 1. 配置流程

```
管理员进入配置中心
    ↓
配置微应用信息
    ├─> 基本信息（名称、入口、激活规则）
    ├─> 菜单信息（名称、图标）
    └─> 权限信息
    ↓
保存到服务端
    ↓
主应用自动更新（或重启）
```

### 2. 加载流程

```
主应用启动
    ↓
从服务端拉取配置
    ↓
解析配置
    ├─> 注册微应用
    ├─> 生成基础菜单
    └─> 应用权限规则
    ↓
微应用加载后
    ├─> 暴露详细菜单（覆盖基础菜单）
    └─> 触发菜单刷新
```

### 3. 三层菜单机制

```
第一层：配置中心定义的基础菜单（静态）
    ↓
第二层：主应用启动时加载的配置菜单（服务端）
    ↓
第三层：微应用运行时暴露的详细菜单（动态）
    ↓
最终渲染：合并 + 去重 + 权限过滤
```

## 配置示例

### 完整配置示例

```json
{
  "version": "1.0.0",
  "microApps": [
    {
      "id": "v-app",
      "name": "v-app",
      "displayName": "Vue 应用",
      "description": "基于 Vue 3 的微应用",
      "devEntry": "http://localhost:5173",
      "prodEntry": "https://zxkws.nyc.mn/v-app/",
      "activeRule": ["/v-app"],
      "sandbox": true,
      "enabled": true,
      "menu": {
        "name": "Vue 应用",
        "icon": "⚡",
        "type": "group"
      },
      "permissions": ["v-app:access"],
      "order": 1
    },
    {
      "id": "textdiff",
      "name": "textdiff",
      "displayName": "文本对比",
      "devEntry": "http://localhost:5174",
      "prodEntry": "https://zxkws.nyc.mn/textdiff/",
      "activeRule": ["/textdiff"],
      "enabled": true,
      "menu": {
        "name": "文本对比",
        "icon": "📝",
        "type": "item",
        "children": [
          {
            "name": "文本对比工具",
            "path": "/textdiff/",
            "icon": "🔍"
          }
        ]
      },
      "order": 2
    }
  ],
  "standaloneMenus": [
    {
      "id": "external-docs",
      "name": "文档中心",
      "type": "external",
      "externalUrl": "https://docs.example.com",
      "icon": "📚",
      "openInNewTab": true,
      "visible": true,
      "order": 100
    }
  ],
  "updatedAt": "2025-01-17T10:00:00Z"
}
```

## 实现建议

### 1. 数据存储

```typescript
// 服务端 API
GET  /api/micro-apps/config      // 获取完整配置
POST /api/micro-apps/config      // 更新配置
GET  /api/micro-apps/:id         // 获取单个微应用
PUT  /api/micro-apps/:id         // 更新微应用
```

### 2. 主应用适配

```typescript
// main-app/src/services/configService.ts
export async function loadMicroAppConfig(): Promise<SystemConfig> {
  const config = await fetch('/api/micro-apps/config').then((r) => r.json());
  return config;
}

export function registerMicroAppsFromConfig(config: SystemConfig) {
  const apps = config.microApps
    .filter((app) => app.enabled)
    .map((app) => ({
      name: app.name,
      entry: isDev ? app.devEntry : app.prodEntry,
      activeRule: app.activeRule,
      sandbox: app.sandbox,
    }));

  registerMicroApps(apps);
}
```

### 3. 菜单生成

```typescript
export function generateMenusFromConfig(config: SystemConfig): MenuItem[] {
  // 1. 从微应用配置生成基础菜单
  const microAppMenus = config.microApps
    .filter((app) => app.enabled && app.menu)
    .map((app) => ({
      ...app.menu,
      microAppId: app.id,
      source: 'static',
    }));

  // 2. 添加独立菜单
  const standaloneMenus = config.standaloneMenus || [];

  // 3. 合并并排序
  return [...microAppMenus, ...standaloneMenus].sort((a, b) => (a.order || 0) - (b.order || 0));
}
```

### 4. 配置中心 UI（新微应用）

```
/micro-app-admin
  ├─ /list           # 微应用列表
  ├─ /create         # 创建微应用
  ├─ /edit/:id       # 编辑微应用
  ├─ /menu-config    # 菜单配置
  └─ /preview        # 预览效果
```

## 权限控制

### 菜单权限过滤

```typescript
function filterMenusByPermissions(menus: MenuConfig[], userPermissions: string[]): MenuConfig[] {
  return menus
    .filter((menu) => {
      if (!menu.permissions || menu.permissions.length === 0) {
        return true; // 无权限要求，所有人可见
      }
      return menu.permissions.some((p) => userPermissions.includes(p));
    })
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenusByPermissions(menu.children, userPermissions) : undefined,
    }));
}
```

## 优势总结

### 配置化带来的好处

1. **✅ 零代码新增微应用** - 通过配置中心即可添加
2. **✅ 灵活的菜单管理** - 支持调整顺序、显示/隐藏
3. **✅ 权限精细控制** - 菜单级别的权限控制
4. **✅ 多环境支持** - 开发/生产环境不同入口
5. **✅ 版本管理** - 配置变更可追溯
6. **✅ 热更新** - 配置变更无需重新部署
7. **✅ 降低耦合** - 配置与代码分离

## 迁移路径

### 第一阶段：基础配置化

1. 创建配置数据结构
2. 实现配置 API
3. 主应用支持从配置加载微应用

### 第二阶段：配置中心 UI

1. 创建配置微应用
2. 实现 CRUD 界面
3. 添加权限管理

### 第三阶段：高级特性

1. 配置版本管理
2. 配置预览
3. 灰度发布
4. 动态菜单权限

## 建议

基于你的需求，我建议：

1. **菜单配置策略**：采用**混合模式**
   - 微应用基础菜单与配置绑定
   - 支持微应用运行时覆盖/扩展菜单
   - 支持独立菜单（外部链接、工具菜单等）

2. **实现优先级**：
   - P0: 微应用配置基础结构
   - P0: 从配置加载微应用
   - P1: 菜单配置
   - P1: 配置中心 UI
   - P2: 权限系统
   - P2: 版本管理

3. **数据存储**：
   - 开发阶段：JSON 文件或 LocalStorage
   - 生产环境：数据库 + REST API
