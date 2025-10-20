import { MenuItem } from '../../types';
import { createId } from '../../utils';
import './MenusPanel.css';

interface MenuPanelProps {
  menus: MenuItem[];
  onChange: (_next: MenuItem[]) => void;
}

const createBlankMenu = (): MenuItem => ({
  id: createId(),
  name: '新菜单项',
  path: '/path',
  type: 'item',
  visible: true,
});

const updateItem = (menus: MenuItem[], id: string, updater: (_item: MenuItem) => MenuItem): MenuItem[] => {
  return menus.map((item) => {
    if (item.id === id) {
      return updater({ ...item });
    }
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: updateItem(item.children, id, updater),
      };
    }
    return item;
  });
};

const removeItem = (menus: MenuItem[], id: string): MenuItem[] =>
  menus
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children ? removeItem(item.children, id) : undefined,
    }));

const appendChild = (menus: MenuItem[], parentId: string, child: MenuItem): MenuItem[] =>
  menus.map((item) => {
    if (item.id === parentId) {
      const children = item.children ?? [];
      return {
        ...item,
        type: 'group',
        children: [...children, child],
      };
    }
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: appendChild(item.children, parentId, child),
      };
    }
    return item;
  });

interface MenuEditorProps {
  item: MenuItem;
  depth: number;
  onUpdate: (_id: string, _updater: (_node: MenuItem) => MenuItem) => void;
  onRemove: (_id: string) => void;
  onAppendChild: (_id: string) => void;
}

const MenuEditor = ({ item, depth, onUpdate, onRemove, onAppendChild }: MenuEditorProps) => {
  const indent = { marginLeft: depth * 12 };

  return (
    <div className="menu-editor" style={indent}>
      <div className="menu-editor-header">
        <strong>{item.name}</strong>
        <div className="menu-editor-tools">
          <button onClick={() => onAppendChild(item.id)}>添加子菜单</button>
          <button onClick={() => onRemove(item.id)}>删除</button>
        </div>
      </div>
      <div className="menu-editor-grid">
        <label>
          <span>名称</span>
          <input
            value={item.name}
            onChange={(event) => onUpdate(item.id, (node) => ({ ...node, name: event.target.value }))}
          />
        </label>
        <label>
          <span>路径</span>
          <input
            value={item.path ?? ''}
            onChange={(event) => onUpdate(item.id, (node) => ({ ...node, path: event.target.value }))}
          />
        </label>
        <label>
          <span>图标</span>
          <input
            value={item.icon ?? ''}
            onChange={(event) => onUpdate(item.id, (node) => ({ ...node, icon: event.target.value }))}
            placeholder="emoji 或 icon 名称"
          />
        </label>
        <label>
          <span>排序</span>
          <input
            type="number"
            value={item.order ?? 0}
            onChange={(event) => onUpdate(item.id, (node) => ({ ...node, order: Number(event.target.value) }))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={item.visible !== false}
            onChange={(event) => onUpdate(item.id, (node) => ({ ...node, visible: event.target.checked }))}
          />
          <span>可见</span>
        </label>
      </div>
      {item.description && <p className="menu-editor-desc">{item.description}</p>}
      {item.children && item.children.length > 0 && (
        <div className="menu-editor-children">
          {item.children.map((child) => (
            <MenuEditor
              key={child.id}
              item={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAppendChild={onAppendChild}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MenusPanel = ({ menus, onChange }: MenuPanelProps) => {
  return (
    <section className="menus-panel">
      <header>
        <div>
          <h3>独立菜单</h3>
          <p>配置无需绑定微应用的独立入口，支持层级结构。</p>
        </div>
        <button
          onClick={() => {
            const next = createBlankMenu();
            onChange([...(menus ?? []), next]);
          }}
        >
          添加菜单
        </button>
      </header>
      <div className="menus-body">
        {menus.length === 0 && <div className="menus-placeholder">暂无独立菜单。</div>}
        {menus.map((item) => (
          <MenuEditor
            key={item.id}
            item={item}
            depth={0}
            onUpdate={(id, updater) => onChange(updateItem(menus, id, updater))}
            onRemove={(id) => onChange(removeItem(menus, id))}
            onAppendChild={(id) => onChange(appendChild(menus, id, createBlankMenu()))}
          />
        ))}
      </div>
    </section>
  );
};
