// PrivateRoute.js
import { useAuth } from '../context/AuthContext';
import { appHistory } from '@ice/stark-app';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        appHistory.push('/login')
        return null;
    }

    return children;
};

export default PrivateRoute;
