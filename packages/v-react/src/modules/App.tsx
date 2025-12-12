import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import getBasename from '@ice/stark-app/lib/getBasename';
import PdfEditorApp from '../features/pdf-editor/PdfEditorApp';
import KnowledgeHubApp from '../features/knowledge-hub/KnowledgeHubApp';
import CodexChatApp from '../features/codex-chat/App';
import DbOpsApp from '../features/db-ops/App';
import { NotesApp } from './notes/NotesApp';

export const App = ({ basename }: { basename?: string }) => {
  // icestark 会为子应用下发 basename；当前项目统一以 /v-react 作为基准路径
  const routerBasename = basename ?? getBasename() ?? '/';

  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        {/* 功能路由：主应用通过 /v-react/xxx 映射为子应用内部的 /xxx */}
        <Route path="pdf-editor" element={<PdfEditorApp basename={basename} />} />
        <Route path="codex-chat" element={<CodexChatApp basename={basename} />} />
        <Route path="knowledge-hub" element={<KnowledgeHubApp basename={basename} />} />
        <Route path="db-ops" element={<DbOpsApp basename={basename} />} />

        {/* Obsidian 笔记菜单（/v-react/notes） */}
        <Route path="notes" element={<NotesApp basename={basename} />} />
        {/* 访问 /v-react 时默认进入笔记 */}
        <Route index element={<Navigate to="notes" replace />} />
        {/* 未匹配时展示 404 */}
        <Route
          path="*"
          element={
            <div style={{ padding: 16, fontSize: 14, color: 'var(--color-text, #666)' }}>
              页面不存在
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
