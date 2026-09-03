import React, { AnchorHTMLAttributes, forwardRef, MouseEvent } from 'react';
import { useRouter } from './next-navigation';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace = false, scroll = true, onClick, children, ...props },
  ref
) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }

    // Standard modifiers: Ctrl+click, Cmd+click, middle click -> open in new tab
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey
    ) {
      return;
    }

    // External links
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      return;
    }

    e.preventDefault();
    if (replace) {
      router.replace(href, { scroll });
    } else {
      router.push(href, { scroll });
    }
  };

  return (
    <a ref={ref} href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});

export default Link;
