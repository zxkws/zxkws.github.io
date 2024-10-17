import { useEffect, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

export const wrapperPageWithProps = () => {
  return (PageComponent) => {
    return (props) => {
      <PageComponent {...props} />;
    };
  };
};

export const wrapperPageWithErrorBoundary = () => {
  return (PageComponent) => {
    const { pageConfig } = PageComponent;
    return (props) => {
      if (pageConfig.errorBoundary) {
        return (
          <ErrorBoundary>
            <PageComponent {...props} />
          </ErrorBoundary>
        );
      }
      return <PageComponent {...props} />;
    };
  };
};

export const wrapperPageWithCSR = () => {
  return (PageComponent) => {
    const { pageConfig } = PageComponent;
    const { scrollToTop, title } = pageConfig || {};
    return (props) => {
      const [data, setData] = useState(window.__ICE_PAGE_PROPS__);
      useEffect(() => {
        if (title) {
          document.title = title;
        }
        if (scrollToTop) {
          window.scrollTo(0, 0);
        }
        if (Window.__ICE_PAGE_PROPS__) {
          Window.__ICE_PAGE_PROPS__ = null;
        } else if (PageComponent.getInitialProps) {
          (async () => {
            const result = await PageComponent.getInitialProps();
            setData(result);
          })();
        }
      }, []);
      return <PageComponent {...props} {...data} />;
    };
  };
};
