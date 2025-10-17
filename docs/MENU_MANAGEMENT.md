# 菜单管理机制

本文档说明主应用如何统一管理微应用的菜单。

## 架构设计

### 核心理念

1. **主应用接管菜单**：微应用在主应用环境中隐藏自己的导航栏，将菜单暴露给主应用
2. **独立运行支持**：微应用独立访问时显示完整的导航和菜单
3. **动态集成**：主应用动态收集并整合所有微应用的菜单配置

## 实现方案

### 1. 微应用端配置

#### 创建菜单配置文件

在微应用中创建 `menuConfig.ts`：

```typescript
// packages/v-app/src/menuConfig.ts
export interface MenuItem {
  name: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
  {
    name: '导航列表',
    path: '/v-app/navList',
    icon: '🏠',
  },
  {
    name: 'Todo',
    path: '/v-app/todo',
    icon: '✅',
  },
];

// 暴露菜单给主应用
export const exposeMenuToHost = (basename = '/v-app') => {
  if (typeof window === 'undefined') return;

  if (!window.__MICRO_APP_MENUS__) {
    window.__MICRO_APP_MENUS__ = [];
  }

  window.__MICRO_APP_MENUS__.push({
    appName: 'v-app',
    menus: menuConfig,
  });
};
```

#### 在启动时暴露菜单

```typescript
// packages/v-app/src/main.ts
import { exposeMenuToHost } from './menuConfig';

const renderApp = ({ container, basename, isMicroApp }) => {
  // ...初始化代码

  // 在微前端环境中暴露菜单
  if (isMicroApp) {
    exposeMenuToHost(basename);
  }

  // ...其他代码
};
```

#### 条件渲染导航

微应用已经通过 `isMicroApp` 状态控制导航显示：

```vue
<template>
  <div class="w-full h-full flex flex-col">
    <!-- 只在独立运行时显示 Header 和 Menu -->
    <Header v-if="!isMicroApp" />
    <div class="flex flex-1 overflow-hidden">
      <Menu v-if="!isMicroApp" />
      <section class="flex-1 overflow-y-auto">
        <router-view />
      </section>
    </div>
  </div>
</template>
```

### 2. 主应用端集成

#### 类型定义

```typescript
// packages/main-app/src/types/menu.ts
export interface MenuItem {
  name: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
}

export interface MicroAppMenuConfig {
  appName: string;
  menus: MenuItem[];
}

declare global {
  interface Window {
    __MICRO_APP_MENUS__?: MicroAppMenuConfig[];
  }
}
```

#### 菜单配置文件

```typescript
// packages/main-app/src/layouts/BasicLayout/menuConfig.ts
import type { MenuItem } from '../../types/menu';

// 主应用自己的静态菜单
const staticMenuConfig: MenuItem[] = [
  { name: 'Home', path: '/', icon: 'chart-pie' },
  { name: 'About', path: '/about', icon: 'chart-pie' },
];

// 收集微应用菜单
const getMicroAppMenus = (): MenuItem[] => {
  if (typeof window === 'undefined' || !window.__MICRO_APP_MENUS__) {
    return [];
  }

  return window.__MICRO_APP_MENUS__.map((config) => ({
    name: config.appName,
    icon: 'atm',
    children: config.menus,
  }));
};

// 动态获取完整菜单配置
export const getAsideMenuConfig = (): MenuItem[] => {
  const microMenus = getMicroAppMenus();
  return [...staticMenuConfig, ...microMenus];
};
```

#### 导航组件

```typescript
// packages/main-app/src/layouts/BasicLayout/components/PageNav/index.tsx
import { getAsideMenuConfig, refreshMenus } from '../../menuConfig';

const PageNav = () => {
  const [menuConfig, setMenuConfig] = useState(() => getAsideMenuConfig());

  useEffect(() => {
    const handlePathChange = () => {
      // 路由变化时刷新菜单
      refreshMenus();
      setMenuConfig(getAsideMenuConfig());
    };

    // 监听路由变化
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  return <nav>{/* 渲染 menuConfig */}</nav>;
};
```

## 工作流程

### 1. 微应用加载流程

```
主应用启动
    ↓
加载微应用（v-app）
    ↓
微应用检测到 isMicroApp = true
    ↓
隐藏自己的导航栏和菜单
    ↓
调用 exposeMenuToHost()
    ↓
将菜单配置写入 window.__MICRO_APP_MENUS__
    ↓
主应用收集菜单配置
    ↓
在主应用侧边栏显示微应用菜单
```

### 2. 独立访问流程

```
直接访问微应用
    ↓
isMicroApp = false
    ↓
显示完整的导航栏和菜单
    ↓
不暴露菜单到全局
    ↓
使用自己的路由和菜单系统
```

## 关键点

### 1. 环境检测

微应用通过 `isMicroApp` 状态判断运行环境：

```typescript
// 在 mount 时传入
export const mount = async (options = {}) => {
  renderApp({
    container: target,
    basename: basename ?? customProps?.basename,
    isMicroApp: customProps?.isMicroApp ?? true, // 由主应用传入
  });
};
```

### 2. 路径处理

微应用菜单路径需要包含 basename：

```typescript
export const menuConfig: MenuItem[] = [
  {
    name: '导航列表',
    path: '/v-app/navList', // 包含 basename
    icon: '🏠',
  },
];
```

### 3. 动态刷新

主应用在路由变化时刷新菜单配置，确保能及时获取新加载微应用的菜单。

## 扩展新微应用

添加新微应用的菜单步骤：

1. **创建菜单配置**：

   ```typescript
   // packages/new-app/src/menuConfig.ts
   export const menuConfig = [{ name: '首页', path: '/new-app/', icon: '🏠' }];
   export const exposeMenuToHost = (basename) => {
     window.__MICRO_APP_MENUS__.push({
       appName: 'new-app',
       menus: menuConfig,
     });
   };
   ```

2. **在启动时暴露**：

   ```typescript
   if (isMicroApp) {
     exposeMenuToHost(basename);
   }
   ```

3. **条件渲染导航**：
   ```jsx
   {
     !isMicroApp && <Navigation />;
   }
   ```

## 优势

✅ **统一体验**：用户在主应用中看到统一的导航
✅ **独立部署**：微应用可以独立访问和运行
✅ **低耦合**：通过全局变量通信，主应用和微应用解耦
✅ **易扩展**：新增微应用只需遵循规范即可自动集成
✅ **动态加载**：支持运行时动态添加微应用菜单

## 注意事项

1. **路径一致性**：确保微应用菜单路径与实际路由匹配
2. **图标规范**：建议使用统一的图标系统
3. **命名规范**：appName 应该唯一且有意义
4. **生命周期**：确保在微应用挂载后再暴露菜单
5. **清理机制**：微应用卸载时考虑清理菜单配置
