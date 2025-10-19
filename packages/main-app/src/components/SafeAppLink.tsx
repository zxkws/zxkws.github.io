import { useCallback, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import appHistory from '@ice/stark/lib/appHistory';

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

const shouldOpenInNewTab = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

const SafeAppLink = ({ to, hashType, replace, message, onClick, ...rest }: SafeAppLinkProps) => {
  const href = buildHref(to, hashType);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || shouldOpenInNewTab(event)) {
        return;
      }

      event.preventDefault();

      if (message && window.confirm(message) === false) {
        return;
      }

      if (replace) {
        appHistory.replace(href);
      } else {
        appHistory.push(href);
      }
    },
    [href, message, onClick, replace],
  );

  return <a {...rest} href={href} onClick={handleClick} />;
};

export default SafeAppLink;
