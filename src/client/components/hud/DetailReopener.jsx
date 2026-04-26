import useStore from '../../lib/store.js';

/**
 * Small floating pill that re-opens the right-hand detail panel after the
 * user has dismissed it. Appears only when there's a lingering selection
 * but the panel is currently closed — especially useful on mobile where
 * the panel covers the whole map.
 */
export default function DetailReopener() {
  const selectedStop = useStore(s => s.selectedStop);
  const stopDetailOpen = useStore(s => s.stopDetailOpen);
  const openStopDetail = useStore(s => s.openStopDetail);

  if (!selectedStop || stopDetailOpen) return null;

  const label = selectedStop.stopName || `Stop #${selectedStop.stopCode || selectedStop.stopId}`;

  return (
    <button
      type="button"
      onClick={openStopDetail}
      className="fixed left-3 bottom-28 z-[2500] inline-flex max-w-[min(100vw-6rem,280px)] items-center gap-1.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-2.5 py-1.5 text-[10px] tracking-[0.15em] text-[var(--color-on-surface)] uppercase shadow-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] sm:absolute sm:top-20 sm:right-14 sm:bottom-auto sm:left-auto"
      title="Re-open stop detail panel"
    >
      <span className="text-[var(--color-primary)]">◈</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
