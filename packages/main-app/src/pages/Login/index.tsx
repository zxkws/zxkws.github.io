import { useAuth } from '../../context/AuthContext';
// import { Link } from 'ice';
// import { appHistory } from '@ice/stark-app';

const Login = () => {
  const { login } = useAuth();

  const onLogin = () => {
    localStorage.setItem('id', '1');
    login && login();
    // appHistory.push('/')
  };
  return (
    <>
      <h2>登录页面</h2>
      <p>使用独立的 Layout</p>
      <div>
        {/* <Link to="/">返回首页</Link> */}
        <button onClick={onLogin}>登陆</button>
      </div>
    </>
  );
};

export default Login;
