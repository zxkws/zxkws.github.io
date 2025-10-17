# 菜单加载流程详解

## 问题背景

### 原始问题

```
主应用启动
    ↓
读取菜单配置 (window.__MICRO_APP_MENUS__ = [])
    ↓
渲染菜单 (没有微应用菜单项) ❌
    ↓
用户无法点击进入微应用
    ↓
微应用永远不会被加载
    ↓
菜单永远不会被暴露
```

这是一个**鸡生蛋还是蛋生鸡**的问题：

- 没有菜单 → 用户无法访问微应用
- 不访问微应用 → 微应用不加载
- 微应用不加载 → 菜单无法暴露

## 解决方案

### 两阶段菜单加载机制

```
阶段一：预定义菜单（主应用启动时）
    ↓
阶段二：动态更新菜单（微应用加载后）
```

## 详细流程

### 阶段一：主应用启动 - 预定义默认菜单

```typescript
// 1. 主应用启动
main-app 启动
    ↓
// 2. 初始化 ice-stark
ensureIcestarkStarted()
    ↓
// 3. 预定义微应用菜单
initializeMicroAppMenus()
    ↓
    └─> window.__MICRO_APP_MENUS__ = [
          {
            appName: 'v-app',
            menus: [
              { name: '导航列表', path: '/v-app/navList' },
              { name: 'Todo', path: '/v-app/todo' },
              { name: '账户管理', path: '/v-app/account' },
              { name: 'LLM 排名', path: '/v-app/llm-ranking' }
            ]
          },
          {
            appName: 'textdiff',
            menus: [
              { name: '文本对比工具', path: '/textdiff/' }
            ]
          }
        ]
    ↓
// 4. 渲染菜单（包含微应用入口）
PageNav 渲染菜单
    ↓
用户可以看到并点击微应用菜单 ✅
```

**关键代码位置**：

- `packages/main-app/src/core/icestark.ts:56-75` - `initializeMicroAppMenus()`
- `packages/main-app/src/core/icestark.ts:36-54` - `MICRO_APP_MENU_META`

### 阶段二：微应用加载 - 动态更新菜单

```typescript
// 1. 用户点击菜单进入微应用路由
用户点击 "Vue 应用 > Todo"
    ↓
// 2. ice-stark 加载微应用
ice-stark 加载 v-app
    ↓
// 3. 微应用挂载
v-app.mount()
    ↓
    └─> renderApp({ isMicroApp: true })
            ↓
            └─> if (isMicroApp) {
                  exposeMenuToHost(basename)
                }
    ↓
// 4. 更新全局菜单配置
exposeMenuToHost()
    ↓
    ├─> 覆盖 window.__MICRO_APP_MENUS__[0]（v-app）
    │   with 微应用实际的菜单配置
    │
    └─> 触发事件
        window.dispatchEvent('micro-app-menu-updated')
    ↓
// 5. 主应用监听事件并刷新菜单
PageNav 监听 'micro-app-menu-updated'
    ↓
    └─> handleMenuUpdate()
            ↓
            ├─> refreshMenus()
            └─> setMenuConfig(getAsideMenuConfig())
    ↓
// 6. 菜单更新完成
菜单可能包含微应用运行时生成的动态项 ✅
```

**关键代码位置**：

- `packages/v-app/src/main.ts:75-77` - 条件暴露菜单
- `packages/v-app/src/menuConfig.ts:60` - 触发更新事件
- `packages/main-app/src/layouts/BasicLayout/components/PageNav/index.tsx:128-129` - 监听事件

## 事件机制

### 事件类型

| 事件名                       | 触发时机           | 触发源    | 监听者  | 用途                 |
| ---------------------------- | ------------------ | --------- | ------- | -------------------- |
| `micro-app-mounted`          | 微应用首次加载完成 | ice-stark | PageNav | 通知菜单可以刷新     |
| `micro-app-menu-updated`     | 微应用更新菜单配置 | 微应用    | PageNav | 通知菜单需要重新渲染 |
| `micro-app-loading` (自定义) | 微应用加载状态变化 | ice-stark | App     | 显示 loading 状态    |

### 事件监听

```typescript
// PageNav.tsx
useEffect(() => {
  const handleMenuUpdate = () => {
    refreshMenus();
    setMenuConfig(getAsideMenuConfig());
  };

  window.addEventListener('micro-app-mounted', handleMenuUpdate);
  window.addEventListener('micro-app-menu-updated', handleMenuUpdate);

  return () => {
    window.removeEventListener('micro-app-mounted', handleMenuUpdate);
    window.removeEventListener('micro-app-menu-updated', handleMenuUpdate);
  };
}, []);
```

## 菜单配置对比

### 默认菜单 vs 动态菜单

| 特性     | 默认菜单（阶段一）                 | 动态菜单（阶段二）                   |
| -------- | ---------------------------------- | ------------------------------------ |
| 定义位置 | 主应用 `icestark.ts`               | 微应用 `menuConfig.ts`               |
| 加载时机 | 主应用启动时                       | 微应用加载后                         |
| 数据来源 | 静态配置                           | 可以是动态生成（如权限菜单）         |
| 更新机制 | 手动修改代码                       | 微应用可以运行时更新                 |
| 适用场景 | 提供基础入口，保证用户能访问微应用 | 提供完整功能，可以包含权限、状态相关 |

### 示例对比

```typescript
// 默认菜单（简单）
{
  appName: 'v-app',
  menus: [
    { name: '导航列表', path: '/v-app/navList' },
    { name: 'Todo', path: '/v-app/todo' },
  ]
}

// 动态菜单（可能更丰富）
{
  appName: 'v-app',
  menus: [
    { name: '导航列表', path: '/v-app/navList', icon: '🏠', badge: '新' },
    { name: 'Todo', path: '/v-app/todo', icon: '✅', count: 5 },
    { name: '账户管理', path: '/v-app/account', icon: '👤' },
    { name: 'LLM 排名', path: '/v-app/llm-ranking', icon: '📊' },
    // 可能根据用户权限动态添加
    { name: '管理后台', path: '/v-app/admin', icon: '⚙️' }
  ]
}
```

## 优势

### 1. 解决冷启动问题

✅ 用户始终能看到微应用入口
✅ 不需要预加载所有微应用
✅ 按需加载，提升性能

### 2. 支持动态更新

✅ 微应用可以根据权限动态生成菜单
✅ 支持菜单的增删改
✅ 支持运行时配置

### 3. 渐进增强

✅ 先显示基础菜单（默认）
✅ 后显示完整菜单（动态）
✅ 用户体验平滑过渡

## 完整时序图

```
时间轴    主应用                    ice-stark              v-app
  │
  ├─> 启动
  │      │
  │      ├─> initializeMicroAppMenus()
  │      │   ├─> 写入默认菜单到全局
  │      │   └─> 渲染菜单（含微应用入口）✅
  │      │
  │      └─> 等待用户交互
  │
  ├─> 用户点击 "Vue 应用 > Todo"
  │      │
  │      └─> 路由变化 /v-app/todo
  │                  │
  │                  ├─> 检测路由匹配
  │                  │   └─> activePath: ['/v-app']
  │                  │
  │                  └─> 加载微应用
  │                              │
  │                              └─> 请求 v-app entry
  │                                      │
  │                                      ├─> 下载资源
  │                                      │
  │                                      └─> 执行 mount()
  │                                              │
  │                                              ├─> renderApp({ isMicroApp: true })
  │                                              │       │
  │                                              │       └─> exposeMenuToHost()
  │                                              │               │
  │                                              │               ├─> 覆盖全局菜单
  │                                              │               └─> dispatch('micro-app-menu-updated')
  │                                              │
  │                                              └─> dispatch('micro-app-mounted')
  │      │
  │      ├─> 监听到 'micro-app-mounted'
  │      │   └─> refreshMenus()
  │      │
  │      └─> 监听到 'micro-app-menu-updated'
  │          └─> setMenuConfig(getAsideMenuConfig())
  │              └─> 重新渲染菜单 ✅
  │
  └─> 完成
```

## 注意事项

### 1. 菜单一致性

默认菜单和动态菜单应该保持路径一致，避免用户困惑。

### 2. 性能考虑

- 菜单刷新使用缓存机制（`cachedMenus`）
- 避免频繁刷新
- 事件监听要及时清理

### 3. 错误处理

如果微应用加载失败，用户仍然可以看到默认菜单。

### 4. 扩展性

新增微应用只需：

1. 在 `MICRO_APP_MENU_META` 添加默认菜单
2. 在微应用中实现 `exposeMenuToHost()`
3. 在微应用中条件渲染导航

## 总结

通过**两阶段菜单加载**机制：

1. **阶段一（预定义）**：解决冷启动问题，提供基础入口
2. **阶段二（动态更新）**：支持权限、状态等动态特性

这样既保证了用户体验，又保持了架构的灵活性。✅
