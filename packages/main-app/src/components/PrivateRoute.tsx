// PrivateRoute.js
import { useAuth } from '../context/AuthContext';
import { appHistory } from '@ice/stark';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated && false) {
    appHistory.push('/login');
    return null;
  }

  return children;
};

export default PrivateRoute;
