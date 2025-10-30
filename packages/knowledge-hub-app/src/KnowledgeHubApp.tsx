import { useEffect } from 'react';

import App from './App';

type KnowledgeHubAppProps = {
  basename?: string;
};

const KnowledgeHubApp = ({ basename }: KnowledgeHubAppProps) => {
  useEffect(() => {
    document.title = 'Knowledge Hub - 知识中台';
  }, []);

  return <App basename={basename} />;
};

export default KnowledgeHubApp;
