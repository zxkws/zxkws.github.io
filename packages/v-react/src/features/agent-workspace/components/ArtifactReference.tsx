import { useState } from 'react';
import type { TextArtifactRef } from '../domain';
import { useAgentWorkspaceClient } from '../data/context';
import { ActionNotice, KeyValue } from './Primitives';

export function ArtifactReference({ artifact }: { artifact: TextArtifactRef | null }) {
  const client = useAgentWorkspaceClient();
  const [notice, setNotice] = useState<string | null>(null);
  if (!artifact) return <span className="aw-raw">null</span>;

  const download = async () => {
    setNotice(null);
    try {
      const grant = await client.getArtifactDownload(artifact.id);
      window.open(grant.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="aw-card">
      <KeyValue
        entries={[
          { label: 'id', value: artifact.id },
          { label: 'kind', value: artifact.kind },
          { label: 'mediaType', value: artifact.mediaType },
          { label: 'byteSize', value: artifact.byteSize },
          { label: 'sha256', value: artifact.sha256 },
          { label: 'truncated', value: artifact.truncated },
          { label: 'redactionStatus', value: artifact.redactionStatus },
        ]}
      />
      <pre className="aw-log">{artifact.preview}</pre>
      <button className="aw-button aw-button--ghost" type="button" onClick={() => void download()}>
        获取短期下载地址
      </button>
      <ActionNotice message={notice} />
    </div>
  );
}
