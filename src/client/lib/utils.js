export function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

/**
 * Swiftly sometimes returns schedule-only placeholders like
 * `block_105_schedBasedVehicle` instead of a real vehicle id — they are long
 * and break fixed-width UI. Returns a short label; pass the raw value as
 * `title` on the element for tooltips.
 */
export function formatPredictionVehicleId(vehicleId) {
  if (vehicleId == null || vehicleId === '') return '—';
  const s = String(vehicleId);
  if (/schedBasedVehicle/i.test(s) || /^block_\d+_/i.test(s)) {
    const m = s.match(/block_(\d+)_/i);
    if (m) return `Block ${m[1]} · sched`;
    return 'Scheduled';
  }
  if (s.length > 22) return `${s.slice(0, 20)}…`;
  return s;
}

export function formatCountdown(seconds) {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function formatSpeed(metersPerSec) {
  if (!metersPerSec) return '0';
  return Math.round(metersPerSec * 2.237).toString(); // m/s to mph
}

/** Same window as VehicleLayer tooltips — mask stale AVL speed when position is unchanged. */
export const STATIONARY_IDLE_MS = 25_000;

/**
 * @param {number | null | undefined} metersPerSec
 * @param {number | undefined} lastMovedAtMs — from store `vehicleLastMovedAt` (API position change)
 */
export function getDisplaySpeedMph(metersPerSec, lastMovedAtMs) {
  const raw = metersPerSec ? Math.round(metersPerSec * 2.237) : 0;
  if (lastMovedAtMs == null) return { mph: raw, showIdle: false };
  const idle = Date.now() - lastMovedAtMs > STATIONARY_IDLE_MS;
  return { mph: idle ? 0 : raw, showIdle: idle && raw > 0 };
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}

export function getRouteDisplayColor(route) {
  if (route.color) return `#${route.color}`;
  if (route.typeName === 'rail' || route.type <= 1) return '#00c1ff';
  return '#ff9d00';
}

export function getVehicleIcon(agency) {
  return agency === 'lametro-rail' ? 'rail' : 'bus';
}
