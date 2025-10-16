import type { PropsWithChildren } from 'react';

type PageLoadingProps = PropsWithChildren<{
  loading?: boolean;
}>;

const PageLoading = (props: PageLoadingProps) => {
  const { children, loading = false } = props;
  return (
    <div id="child-container" style={{ alignContent: 'center' }} className="flex flex-1 text-center">
      {loading ? 'loading...' : children}
    </div>
  );
};

export default PageLoading;
