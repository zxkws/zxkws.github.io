import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appHistory } from '@ice/stark-app';
import { Button } from '@alifd/next';

import styles from './index.module.css';

export default function Home(props) {
  useEffect(() => {
    console.log('Home Page mounted');
    return () => {
      console.log('Home Page unmounted');
    };
  }, []);
  return (
    <div className={styles.app}>
      <Link to="/detail">微应用跳转内部路由</Link>
      <br />
      <Link to="/nav">菜单</Link>
      <br />
      <br />
      <Button
        type="primary"
        onClick={() => {
          appHistory.push('/');
        }}
      >
        微应用间跳转 1
      </Button>
      <br />
      <br />
      <Button
        type="primary"
        onClick={() => {
          appHistory.push('/waiter');
        }}
      >
        微应用间跳转 2
      </Button>
    </div>
  );
}
