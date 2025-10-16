import PageNav from './components/PageNav';

export default function BasicLayout(props: { children: React.ReactNode; pathname?: string }) {
  const { children } = props;
  return (
    <>
      <div className={'flex justify-center'}>header bar</div>
      <div
        style={{
          flex: 1,
          display: 'flex',
        }}
      >
        <PageNav />
        {children}
      </div>
    </>
  );
}
