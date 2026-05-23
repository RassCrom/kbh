import { useEffect, useState } from 'react';

const MQ = '(max-width: 767px)';

/** Returns `true` on narrow viewports (≤ 767 px) — re-evaluates on resize. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MQ).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(MQ);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return mobile;
}

/** `true` when the primary input is coarse (touch) — evaluated once. */
export const IS_TOUCH_DEVICE =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;
