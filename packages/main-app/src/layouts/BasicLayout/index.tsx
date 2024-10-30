import PageNav from './components/PageNav';
// import Footer from './components/Footer';
// import PrivateRoute from '@/components/PrivateRoute';

declare global {
  interface Window {
    webpackJsonp?: any[];
  }
}

export default function BasicLayout(props: { children: React.ReactNode; pathname?: string }) {
  const { children, pathname } = props;
  console.warn(pathname);
  return (
    <>
      <div>header bar</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
        }}
      >
        <PageNav />
        {children}
        {/* <PrivateRoute>{children}</PrivateRoute> */}
        {/* <Footer /> */}
      </div>
    </>
  );
}
