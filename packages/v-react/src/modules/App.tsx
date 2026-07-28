import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import getBasename from '@ice/stark-app/lib/getBasename';
import DbOpsApp from '../features/db-ops/App';
import KeepaliveApp from '../features/keepalive/App';
import { NotesApp } from './notes/NotesApp';
import AiAdminApp from '../features/ai-admin/App';
import AssistantsApp from '../features/assistants/App';
import KnowledgeBasesApp from '../features/knowledge-bases/App';
import ModelPlaygroundApp from '../features/model-playground/App';

export const App = ({ basename }: { basename?: string }) => {
  // icestark 会为子应用下发 basename；当前项目统一以 /v-react 作为基准路径
  const routerBasename = basename ?? getBasename() ?? '/';

  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        {/* 功能路由：主应用通过 /v-react/xxx 映射为子应用内部的 /xxx */}
        <Route path="db-ops" element={<DbOpsApp basename={basename} />} />
        <Route path="keepalive" element={<KeepaliveApp />} />
        <Route path="ai-admin" element={<AiAdminApp />} />
        <Route path="model-playground" element={<ModelPlaygroundApp />} />
        <Route path="assistants" element={<AssistantsApp />} />
        <Route path="knowledge-bases" element={<KnowledgeBasesApp />} />

        {/* Obsidian 笔记菜单（/v-react/notes） */}
        <Route path="notes" element={<NotesApp basename={basename} />} />
        {/* 访问 /v-react 时默认进入笔记 */}
        <Route index element={<Navigate to="notes" replace />} />
        {/* 未匹配时展示 404 */}
        <Route path="*" element={<div className="v-react-not-found">页面不存在</div>} />
      </Routes>
    </BrowserRouter>
  );
};
