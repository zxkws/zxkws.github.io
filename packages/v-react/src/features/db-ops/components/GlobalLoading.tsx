import { useEffect, useState } from 'react';
import { subscribeLoading } from '../http/loading';

export const GlobalLoading = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeLoading(setActive);
    return unsubscribe;
  }, []);

  if (!active) return null;

  return (
    <div className="db-global-loading" role="status" aria-live="polite" aria-busy={active}>
      <div className="pill">
        <span className="spinner" aria-hidden="true" />
        <span className="text">加载中...</span>
      </div>
    </div>
  );
};

export default GlobalLoading;
