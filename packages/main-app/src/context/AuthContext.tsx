import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext<{ isAuthenticated: boolean; login: () => void; logout: () => void }>({} as any);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  useEffect(() => {
    if (localStorage.getItem('id')) {
      setIsAuthenticated(true);
    }
  }, []);

  return <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
