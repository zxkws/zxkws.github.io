import { createContext, useState, useContext, useEffect, type PropsWithChildren } from 'react';

type AuthContextValue = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  login: () => undefined,
  logout: () => undefined,
});

export const AuthProvider = ({ children }: PropsWithChildren) => {
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
