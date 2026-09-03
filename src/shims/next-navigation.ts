import { useState, useEffect, useCallback, useMemo } from 'react';

// Custom event to notify router listeners of client-side navigation
const NAVIGATE_EVENT = 'app-client-navigation';

function emitNavigate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
  }
}

export interface RouterInstance {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

export function useRouter(): RouterInstance {
  const push = useCallback((href: string, options?: { scroll?: boolean }) => {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', href);
    emitNavigate();
    if (options?.scroll !== false) {
      window.scrollTo(0, 0);
    }
  }, []);

  const replace = useCallback((href: string, options?: { scroll?: boolean }) => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({}, '', href);
    emitNavigate();
    if (options?.scroll !== false) {
      window.scrollTo(0, 0);
    }
  }, []);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') window.history.back();
  }, []);

  const forward = useCallback(() => {
    if (typeof window !== 'undefined') window.history.forward();
  }, []);

  const refresh = useCallback(() => {
    emitNavigate();
  }, []);

  const prefetch = useCallback((_href: string) => {
    // No-op in client SPA
  }, []);

  return useMemo(
    () => ({
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    [push, replace, back, forward, refresh, prefetch]
  );
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') return window.location.pathname || '/';
    return '/';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationChange = () => {
      setPathname(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener(NAVIGATE_EVENT, handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener(NAVIGATE_EVENT, handleLocationChange);
    };
  }, []);

  return pathname;
}

export function useSearchParams(): URLSearchParams {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search);
    return new URLSearchParams();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationChange = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener(NAVIGATE_EVENT, handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener(NAVIGATE_EVENT, handleLocationChange);
    };
  }, []);

  return searchParams;
}

export function useParams(): Record<string, string | string[]> {
  return {};
}
