import ChatWorkspace from './components/ChatWorkspace';

type AppProps = {
  basename?: string;
};

export default function App(_props: AppProps) {
  return <ChatWorkspace />;
}
