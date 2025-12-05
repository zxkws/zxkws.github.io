const Login = () => {
  const redirect = typeof window !== 'undefined' ? window.location.href : '/';
  if (typeof window !== 'undefined') {
    window.location.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
  }
  return null;
};

export default Login;
