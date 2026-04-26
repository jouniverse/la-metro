import useStore from '../../lib/store.js';
import { useCompactLayout } from '../../lib/layout.js';

function mapModeLabel(mapMode, compact) {
  if (mapMode === 'satellite') return compact ? 'SAT' : 'SATELLITE';
  if (mapMode === 'street') return 'STREET';
  return String(mapMode).toUpperCase();
}

export default function StatusBar() {
  const compact = useCompactLayout();
  const vehicleCount = useStore(s => s.vehicleCount);
  const connectionStatus = useStore(s => s.connectionStatus);
  const lastPollTime = useStore(s => s.lastPollTime);
  const mapMode = useStore(s => s.mapMode);

  const lastPoll = lastPollTime
    ? new Date(lastPollTime).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'America/Los_Angeles',
      })
    : '--:--:--';

  return (
    <footer
      className="relative z-[5500] flex h-6 min-h-10 shrink-0 items-center gap-3 overflow-hidden border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)] px-3 pb-1 text-[10px] tracking-[0.12em] text-[var(--color-outline)] uppercase sm:gap-4 sm:px-5 md:px-6"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      <span>
        [ STATUS:{' '}
        <span className={
          connectionStatus === 'connected'
            ? 'text-[var(--color-secondary)]'
            : 'text-[var(--color-error)]'
        }>
          {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
        </span>
        {' ]'}
      </span>
      <span>VEHICLES: <span className="text-[var(--color-primary-dim)]">{vehicleCount.total}</span></span>
      <span>LAST_POLL: <span className="text-[var(--color-on-surface-variant)]">{lastPoll}</span></span>
      <span>
        LAYER:{' '}
        <span className="text-[var(--color-on-surface-variant)]">
          {mapModeLabel(mapMode, compact)}
        </span>
      </span>
      <div className="flex-1" />
      <span>LAT: 34.052 LON: -118.243</span>
    </footer>
  );
}
