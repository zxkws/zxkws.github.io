import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const { login } = useAuth();

  const onLogin = () => {
    localStorage.setItem('id', '1');
    if (login) {
      login();
    }
  };
  return (
    <>
      <h2>登录页面</h2>
      <p>使用独立的 Layout</p>
      <div>
        <button onClick={onLogin}>登陆</button>
      </div>
    </>
  );
};

export default Login;
