import { useAuth } from '../context/AuthContext';
import { appHistory } from '../../../micro-lib/src/index';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    appHistory.push('/login');
    return null;
  }

  return children;
};

export default PrivateRoute;
