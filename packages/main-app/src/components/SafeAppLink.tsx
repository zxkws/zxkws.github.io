import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';

type HashType = 'slash' | 'hashbang' | 'noslash' | boolean;

interface SafeAppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  hashType?: HashType;
  replace?: boolean;
  message?: string;
}

const buildHref = (to: string, hashType?: HashType) => {
  if (!hashType || to.includes('#')) {
    return to;
  }

  return to.startsWith('/') ? `/#${to.slice(1)}` : `/#${to}`;
};

const SafeAppLink = ({ to, hashType, replace, message, onClick, ...rest }: SafeAppLinkProps) => {
  const href = buildHref(to, hashType);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) {
        return;
      }

      event.preventDefault();

      if (message && window.confirm(message) === false) {
        return;
      }

      const method = replace ? 'replaceState' : 'pushState';
      const historyFn = window.history[method];

      if (typeof historyFn === 'function') {
        historyFn.call(window.history, {}, '', href);
      } else {
        window.location.href = href;
      }
    },
    [href, message, onClick, replace],
  );

  return <a {...rest} href={href} onClick={handleClick} />;
};

export default SafeAppLink;
