import { useEffect, useState, useRef } from 'react';
import useStore from '../../lib/store.js';
import { useCompactLayout } from '../../lib/layout.js';

const POLL_INTERVAL_S = 10;

function mapModeLabel(mapMode, compact) {
  if (mapMode === 'satellite') return compact ? 'SAT' : 'SATELLITE';
  if (mapMode === 'street') return 'STREET';
  return String(mapMode).toUpperCase();
}

/** Counts down seconds since lastPollTime, resetting to POLL_INTERVAL_S each poll. */
function PollCountdown({ lastPollTime }) {
  const [secs, setSecs] = useState(POLL_INTERVAL_S);
  const lastPollRef = useRef(lastPollTime);

  useEffect(() => {
    // When a new poll arrives, reset immediately.
    lastPollRef.current = lastPollTime;
    const base = lastPollTime ? new Date(lastPollTime).getTime() : Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - base) / 1000);
      const remaining = Math.max(0, POLL_INTERVAL_S - elapsed);
      setSecs(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lastPollTime]);

  const pct = (secs / POLL_INTERVAL_S) * 100;
  const color = secs <= 2
    ? 'var(--color-secondary)'
    : 'var(--color-on-surface-variant)';

  return (
    <span
      className="hidden md:inline-flex items-center gap-1.5 font-mono"
      title={`Next poll in ${secs}s`}
    >
      <span style={{ color }} className="text-[10px] tracking-[0.1em]">
        NEXT: {String(secs).padStart(2, '0')}s
      </span>
      <span
        style={{
          display: 'inline-block',
          width: '32px',
          height: '3px',
          background: 'var(--color-surface-container)',
          position: 'relative',
          borderRadius: '1px',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: color,
            transition: 'width 0.5s linear, background 0.3s',
          }}
        />
      </span>
    </span>
  );
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
      <PollCountdown lastPollTime={lastPollTime} />
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
