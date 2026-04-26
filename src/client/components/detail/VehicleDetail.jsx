import { useMemo, useState, useEffect } from 'react';
import useStore from '../../lib/store.js';
import { getDisplaySpeedMph } from '../../lib/utils.js';

export default function VehicleDetail() {
  const selectedVehicle = useStore(s => s.selectedVehicle);
  const vehicles = useStore(s => s.vehicles);
  const vehicleLastMovedAt = useStore(s => s.vehicleLastMovedAt);
  const lastPollTime = useStore(s => s.lastPollTime);
  const selectVehicle = useStore(s => s.selectVehicle);

  const v = useMemo(() => {
    if (!selectedVehicle) return null;
    return vehicles.get(selectedVehicle.id) ?? selectedVehicle;
  }, [selectedVehicle, vehicles, lastPollTime]);

  // Recompute idle speed display every second (same clock as tooltips, which
  // refresh on pointer move; the card would otherwise only update on polls).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!selectedVehicle) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [selectedVehicle?.id]);

  if (!v) return null;

  const isRail = v.agency === 'lametro-rail';
  const lastMoved = vehicleLastMovedAt.get(v.id);
  const { mph, showIdle } = getDisplaySpeedMph(v.speed, lastMoved);

  return (
    <div className="absolute bottom-10 left-1/2 z-[1000] min-w-[240px] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="absolute top-0 left-0 h-2 w-2 border-t border-l border-[var(--color-outline)]" />
      <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-[var(--color-outline)]" />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${isRail ? 'bg-[var(--color-tertiary)]' : 'bg-[var(--color-primary)]'}`} />
          <span className="text-xs font-bold tracking-wider">{isRail ? 'RAIL' : 'BUS'} {v.label}</span>
        </div>
        <button
          type="button"
          onClick={() => selectVehicle(null)}
          className="text-xs text-[var(--color-outline)] hover:text-[var(--color-on-surface)]"
        >
          &times;
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <span className="text-[var(--color-outline)] uppercase">Route</span>
        <span className="font-bold text-[var(--color-primary)]">{v.routeId || 'N/A'}</span>

        <span className="text-[var(--color-outline)] uppercase">Speed</span>
        <span className="text-[var(--color-on-surface)]">
          {mph} mph
          {showIdle ? ' (idle)' : ''}
        </span>

        <span className="text-[var(--color-outline)] uppercase">Bearing</span>
        <span className="text-[var(--color-on-surface)]">{v.bearing != null ? `${Math.round(v.bearing)}°` : 'N/A'}</span>

        <span className="text-[var(--color-outline)] uppercase">Position</span>
        <span className="font-mono text-[var(--color-on-surface)]">{v.lat?.toFixed(4)}, {v.lon?.toFixed(4)}</span>
      </div>
    </div>
  );
}
