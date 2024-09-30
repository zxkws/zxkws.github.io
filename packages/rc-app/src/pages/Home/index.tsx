import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appHistory } from '@ice/stark-app';

import styles from './index.module.css';

export default function Home(props) {
  useEffect(() => {
    console.log('Home Page mounted', props);
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
      <button
        onClick={() => {
          appHistory.push('/');
        }}
      >
        微应用间跳转 1
      </button>
      <br />
      <br />
      <button
        onClick={() => {
          appHistory.push('/waiter');
        }}
      >
        微应用间跳转 2
      </button>
    </div>
  );
}
