import PageNav from './components/PageNav';
import Footer from './components/Footer';
import PrivateRoute from '@/components/PrivateRoute';

declare global {
  interface Window {
    webpackJsonp?: any[];
  }
}

export default function BasicLayout(props: { children: React.ReactNode; pathname?: string }) {
  const { children, pathname } = props;
  return (
    <div
      style={{
        minHeight: '100vh',
      }}
    >
      {pathname}
      {children}
      <PageNav />
      <PrivateRoute>{children}</PrivateRoute>
      <Footer />
    </div>
  );
}
