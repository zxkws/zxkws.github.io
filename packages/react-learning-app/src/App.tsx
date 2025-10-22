import type { FC } from 'react';

type AppProps = {
  basename?: string;
};

const App: FC<AppProps> = ({ basename }) => {
  const mode = import.meta.env.MODE;
  const base = basename ?? import.meta.env.BASE_URL ?? '/';

  return (
    <main className="app-shell">
      <header>
        <h1>React 学习微应用</h1>
        <p>面向线上调试的轻量示例，演示 sourcemap 常开配置。</p>
      </header>
      <section>
        <dl>
          <div>
            <dt>运行模式</dt>
            <dd>{mode}</dd>
          </div>
          <div>
            <dt>Micro 前端基准路径</dt>
            <dd>{base}</dd>
          </div>
          <div>
            <dt>Source Map</dt>
            <dd>生产环境同样开启，便于线上排查。</dd>
          </div>
        </dl>
      </section>
    </main>
  );
};

export default App;
