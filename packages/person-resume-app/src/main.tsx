import ReactDOM from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('resume: root container not found');
}

ReactDOM.createRoot(container).render(<App />);
