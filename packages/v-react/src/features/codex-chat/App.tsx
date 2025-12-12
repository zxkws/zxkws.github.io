import ChatWorkspace from './components/ChatWorkspace';
import './styles.css';

type AppProps = {
  basename?: string;
};

export default function App(_props: AppProps) {
  return <ChatWorkspace />;
}
