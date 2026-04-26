import { useState, useEffect } from 'react';

/**
 * “Compact” / touch-primary layout: phones, iPad (portrait + landscape), and
 * other coarse-pointer viewports, without using width alone (which would break
 * desktop at the same width).
 *
 * - Narrow windows: (max-width: 1024px)
 * - Touch tablets: (pointer: coarse) and (max-width: 1366px)
 */
export function isCompactLayoutQuery() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(max-width: 1024px)').matches) return true;
  if (window.matchMedia('(pointer: coarse) and (max-width: 1366px)').matches) return true;
  return false;
}

export function useCompactLayout() {
  const [compact, setCompact] = useState(isCompactLayoutQuery);

  useEffect(() => {
    const m1 = window.matchMedia('(max-width: 1024px)');
    const m2 = window.matchMedia('(pointer: coarse) and (max-width: 1366px)');
    const tick = () => setCompact(m1.matches || m2.matches);
    m1.addEventListener('change', tick);
    m2.addEventListener('change', tick);
    return () => {
      m1.removeEventListener('change', tick);
      m2.removeEventListener('change', tick);
    };
  }, []);

  return compact;
}
