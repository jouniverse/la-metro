import { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { STATIONARY_IDLE_MS } from '../../lib/utils.js';

// Cache icons by a key string to avoid recreating SVG/divIcon objects every tick.
// The key encodes the parameters that affect icon appearance.
const iconCache = new Map();
const MAX_ICON_CACHE = 512;

function createVehicleIcon(isRail, bearing, isSelected) {
  // Round bearing to 5-degree steps to improve cache hit rate without visual degradation.
  const bearingKey = bearing != null ? Math.round(bearing / 5) * 5 : 0;
  const cacheKey = `${isRail ? 1 : 0}-${bearingKey}-${isSelected ? 1 : 0}`;

  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

  const color = isRail ? '#00c1ff' : '#ff9d00';
  const glowAlpha = isSelected ? 0.9 : 0.4;
  const glow = isRail ? `rgba(0,193,255,${glowAlpha})` : `rgba(255,157,0,${glowAlpha})`;
  const rotation = bearingKey;
  const size = isSelected ? 30 : 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20">
    ${isSelected ? `<circle cx="10" cy="10" r="9" fill="none" stroke="${color}" stroke-width="1" opacity="0.6"/>` : ''}
    <g transform="rotate(${rotation} 10 10)">
      <polygon points="10,2 16,16 10,13 4,16" fill="${color}" opacity="0.95" stroke="${color}" stroke-width="0.5"/>
    </g>
    <circle cx="10" cy="10" r="3" fill="${color}" opacity="0.3"/>
  </svg>`;

  const icon = L.divIcon({
    html: `<div class="${isSelected ? 'selected-vehicle-pulse' : ''}" style="filter: drop-shadow(0 0 ${isSelected ? 10 : 4}px ${glow})">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: 'vehicle-marker',
  });

  // Evict oldest entries when cache grows too large.
  if (iconCache.size >= MAX_ICON_CACHE) {
    const firstKey = iconCache.keys().next().value;
    iconCache.delete(firstKey);
  }
  iconCache.set(cacheKey, icon);
  return icon;
}

// Poll interval on the server is 10 s. We interpolate over the full 10 s so
// markers drift continuously between updates instead of "hopping" and stopping.
// Tick at ~15 fps (≈67 ms) — smooth enough visually, kind to the CPU even with
// hundreds of markers.
const INTERP_INTERVAL_MS = 67;
const INTERP_DURATION_MS = 10_000;

// Guard against occasional bogus AVL reports that place a vehicle halfway across
// the city between polls. A bus doing 65 mph covers ~290 m/s, so ~3 km in 10 s
// is a generous ceiling. Beyond that we teleport instead of smearing a long
// linear path across the map.
const TELEPORT_DEG2 = 0.025 * 0.025; // ~2.5 km² squared delta (cheap check)

// Per-marker icon key cache so we skip setIcon() when nothing changed.
// key: vehicleId → last icon cache key string
const markerIconKey = new Map();

export default function VehicleLayer() {
  const map = useMap();
  const vehicles = useStore(s => s.vehicles);
  const filterType = useStore(s => s.filters.type);
  const selectedRoute = useStore(s => s.selectedRoute);
  const selectedVehicle = useStore(s => s.selectedVehicle);
  const animationMode = useStore(s => s.animationMode);
  const selectVehicle = useStore(s => s.selectVehicle);

  const markersRef = useMemo(() => new Map(), []);
  const interpRef = useRef(new Map());
  const animRef = useRef(null);
  // Whether the tick loop is currently scheduled.
  const tickRunningRef = useRef(false);

  // Starts the tick loop if not already running. Called whenever a new
  // interpolation is added so we avoid a perpetual timer when nothing moves.
  const ensureTickRunning = useRef(() => {}).current;

  // Continuous interpolation loop. Stops itself when interpRef is empty to
  // avoid burning CPU cycles while the map is idle.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const done = [];
      for (const [id, interp] of interpRef.current) {
        const marker = markersRef.get(id);
        if (!marker) { done.push(id); continue; }

        const elapsed = now - interp.startTime;
        if (elapsed >= INTERP_DURATION_MS) {
          marker.setLatLng([interp.toLat, interp.toLon]);
          done.push(id);
          continue;
        }
        const t = elapsed / INTERP_DURATION_MS;
        const lat = interp.fromLat + (interp.toLat - interp.fromLat) * t;
        const lon = interp.fromLon + (interp.toLon - interp.fromLon) * t;
        marker.setLatLng([lat, lon]);
      }
      for (const id of done) interpRef.current.delete(id);

      if (interpRef.current.size > 0) {
        animRef.current = setTimeout(tick, INTERP_INTERVAL_MS);
      } else {
        // Nothing left to animate — park the loop.
        tickRunningRef.current = false;
        animRef.current = null;
      }
    };

    // Expose a stable function to kick off the loop from the update effect.
    // We write directly into the ref so the update effect never re-runs because
    // of this function reference changing.
    ensureTickRunning.__impl = () => {
      if (!tickRunningRef.current) {
        tickRunningRef.current = true;
        animRef.current = setTimeout(tick, INTERP_INTERVAL_MS);
      }
    };

    return () => {
      if (animRef.current) clearTimeout(animRef.current);
      tickRunningRef.current = false;
    };
  }, [markersRef]);

  useEffect(() => {
    const activeIds = new Set();
    const selectedId = selectedVehicle?.id;
    const selectedRouteId = selectedRoute?.routeId;
    const now = Date.now();
    let newInterpolations = false;

    for (const [id, v] of vehicles) {
      // Hide vehicles without an active route (depot/deadheading).
      // Always keep the currently selected vehicle visible.
      if (!v.routeId && id !== selectedId) continue;

      if (filterType === 'bus' && v.agency === 'lametro-rail') continue;
      if (filterType === 'rail' && v.agency !== 'lametro-rail') continue;

      if (selectedRoute && v.routeId !== selectedRouteId && id !== selectedId) continue;

      activeIds.add(id);
      const isRail = v.agency === 'lametro-rail';
      const isSelected = id === selectedId;
      const isFocused = isSelected || (selectedRouteId && v.routeId === selectedRouteId);
      // Under 'focused' mode only animate the things the user cares about; in
      // 'off' mode nothing interpolates.
      const shouldAnimate = animationMode === 'all' ||
        (animationMode === 'focused' && isFocused);

      // Build icon key so we only call setIcon when something actually changed.
      const bearingKey = v.bearing != null ? Math.round(v.bearing / 5) * 5 : 0;
      const iconKey = `${isRail ? 1 : 0}-${bearingKey}-${isSelected ? 1 : 0}`;

      const existing = markersRef.get(id);

      if (existing) {
        const currentLatLng = existing.getLatLng();
        const dLat = v.lat - currentLatLng.lat;
        const dLon = v.lon - currentLatLng.lng;
        const posChanged = Math.abs(dLat) > 1e-6 || Math.abs(dLon) > 1e-6;

        if (posChanged) {
          const farJump = (dLat * dLat + dLon * dLon) > TELEPORT_DEG2;
          if (!shouldAnimate || farJump) {
            // Snap to the new position; drop any in-flight interpolation.
            existing.setLatLng([v.lat, v.lon]);
            interpRef.current.delete(id);
          } else {
            interpRef.current.set(id, {
              fromLat: currentLatLng.lat,
              fromLon: currentLatLng.lng,
              toLat: v.lat,
              toLon: v.lon,
              startTime: now,
            });
            newInterpolations = true;
          }
        } else if (!shouldAnimate) {
          // Make sure a stale interpolation from a previous "animate" phase
          // doesn't keep ticking once animation gets disabled.
          interpRef.current.delete(id);
        }

        // Only update icon when appearance changed (avoids heavy DOM work).
        if (markerIconKey.get(id) !== iconKey) {
          existing.setIcon(createVehicleIcon(isRail, v.bearing, isSelected));
          markerIconKey.set(id, iconKey);
        }
        existing.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([v.lat, v.lon], {
          icon: createVehicleIcon(isRail, v.bearing, isSelected),
          interactive: true,
        });
        markerIconKey.set(id, iconKey);

        // Read from the live store inside handlers so tooltips/clicks always
        // reflect the current vehicle state, not the marker's creation snapshot.
        marker.bindTooltip(
          () => {
            const current = useStore.getState().vehicles.get(id);
            if (!current) return '';
            const movedAt = useStore.getState().vehicleLastMovedAt.get(id) ?? 0;
            const stationary = Date.now() - movedAt > STATIONARY_IDLE_MS;
            const rawMph = current.speed ? Math.round(current.speed * 2.237) : 0;
            const speed = stationary ? 0 : rawMph;
            const route = current.routeId || 'N/A';
            const kind = current.agency === 'lametro-rail' ? 'RAIL' : 'BUS';
            const accent = current.agency === 'lametro-rail' ? '#00c1ff' : '#ff9d00';
            return `<div class="text-xs font-mono">
              <div class="font-bold" style="color:${accent}">${kind} ${current.label || current.id}</div>
              <div>ROUTE: ${route}</div>
              <div>SPEED: ${speed} mph${stationary && rawMph > 0 ? ' <span style="color:var(--color-outline)">(idle)</span>' : ''}</div>
            </div>`;
          },
          { className: '', direction: 'top', offset: [0, -8] }
        );

        marker.on('click', () => {
          const current = useStore.getState().vehicles.get(id);
          selectVehicle(current || v);
        });
        if (isSelected) marker.setZIndexOffset(1000);
        marker.addTo(map);
        markersRef.set(id, marker);
      }
    }

    for (const [id, marker] of markersRef) {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.delete(id);
        interpRef.current.delete(id);
        markerIconKey.delete(id);
      }
    }

    // Kick off the animation loop if new interpolations were added this cycle.
    if (newInterpolations && ensureTickRunning.__impl) {
      ensureTickRunning.__impl();
    }
  }, [vehicles, filterType, selectedRoute, selectedVehicle, animationMode, map, markersRef, selectVehicle, ensureTickRunning]);

  useEffect(() => {
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
      tickRunningRef.current = false;
      for (const [, marker] of markersRef) marker.remove();
      markersRef.clear();
      interpRef.current.clear();
      markerIconKey.clear();
    };
  }, [markersRef]);

  return null;
}
