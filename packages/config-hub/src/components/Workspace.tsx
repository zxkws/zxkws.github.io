import { useMemo } from 'react';
import { ConfigDocument, SystemConfigDoc } from '../types';
import { DocumentOverview } from './document/DocumentOverview';
import { MicroAppsPanel } from './microapps/MicroAppsPanel';
import { MenusPanel } from './menus/MenusPanel';
import { JsonPanel } from './panels/JsonPanel';
import './Workspace.css';

interface WorkspaceProps {
  document: ConfigDocument;
  onUpdate: (_updater: (_doc: SystemConfigDoc) => SystemConfigDoc) => void;
}

export const Workspace = ({ document, onUpdate }: WorkspaceProps) => {
  const microApps = document.data.microApps;
  const standaloneMenus = document.data.standaloneMenus ?? [];

  const jsonPreview = useMemo(() => JSON.stringify(document.data, null, 2), [document.data]);

  return (
    <div className="workspace-container">
      <DocumentOverview document={document} onUpdate={onUpdate} />
      <section className="workspace-section">
        <MicroAppsPanel
          microApps={microApps}
          onChange={(next) =>
            onUpdate((doc) => ({
              ...doc,
              microApps: next,
              updatedAt: new Date().toISOString(),
            }))
          }
        />
        <MenusPanel
          menus={standaloneMenus}
          onChange={(next) =>
            onUpdate((doc) => ({
              ...doc,
              standaloneMenus: next,
              updatedAt: new Date().toISOString(),
            }))
          }
        />
      </section>
      <JsonPanel json={jsonPreview} />
    </div>
  );
};
