import { create } from 'zustand';
import { isCompactLayoutQuery } from './layout.js';

// Phones + iPad (coarse pointer) + narrow windows: see `isCompactLayoutQuery`.
const LAYOUT_COMPACT_INIT = isCompactLayoutQuery();

function loadAnimationMode() {
  if (typeof localStorage === 'undefined') return LAYOUT_COMPACT_INIT ? 'off' : 'all';
  const saved = localStorage.getItem('la-metro-animation-mode');
  if (saved === 'all' || saved === 'focused' || saved === 'off') return saved;
  return LAYOUT_COMPACT_INIT ? 'off' : 'all';
}

const useStore = create((set, get) => ({
  // Vehicle data
  vehicles: new Map(),
  /** Last time API reported a new lat/lon for this id (ms) — for idle speed in UI */
  vehicleLastMovedAt: new Map(),
  vehicleCount: { bus: 0, rail: 0, total: 0 },

  // Selection
  selectedRoute: null,
  selectedStop: null,
  selectedVehicle: null,

  // Routes cache
  routes: [],
  routesLoaded: false,

  // Search & filters
  searchQuery: '',
  searchResults: null,
  filters: {
    type: 'all', // 'all' | 'bus' | 'rail'
  },

  // Map
  mapMode: 'street', // 'street' | 'satellite'
  mapCenter: null,
  showAllRoutes: false,
  mapClickLocation: null, // { lat, lon } when user pins a "nearby from here" location
  showTrafficCameras: false, // desktop only

  // UI state
  sidebarOpen: !LAYOUT_COMPACT_INIT, // Map-first on compact / touch layout
  sidebarTab: 'routes', // 'routes' | 'nearby'
  stopDetailOpen: false,
  booted: false,
  /** @deprecated use same checks as `useCompactLayout` — set once at init */
  isMobile: LAYOUT_COMPACT_INIT,

  // Performance — how aggressively we animate vehicle markers.
  // 'all'      → every visible vehicle interpolates over 10 s (nice but heavy)
  // 'focused'  → only the selected vehicle + vehicles on the selected route animate,
  //              others snap to each new position (much lighter CPU)
  // 'off'      → no interpolation at all; every marker teleports on each poll
  animationMode: loadAnimationMode(),

  // Connection
  connectionStatus: 'connecting',
  lastPollTime: null,

  // Favorites (loaded from localStorage)
  favorites: { routes: [], stops: [] },

  // Actions
  setVehicles: (vehicleList) => {
    const map = new Map();
    let bus = 0;
    let rail = 0;
    for (const v of vehicleList) {
      map.set(v.id, v);
      if (v.agency === 'lametro-rail') rail++;
      else bus++;
    }
    const prev = get();
    const prevVehicles = prev.vehicles;
    // Mutate the existing vehicleLastMovedAt Map in place to avoid allocating a
    // new Map (and copying ~1000 entries) on every 10-second poll.
    const vehicleLastMovedAt = prev.vehicleLastMovedAt;
    const eps = 1e-6;
    const now = Date.now();
    for (const [id, v] of map) {
      const p = prevVehicles.get(id);
      if (!p) {
        vehicleLastMovedAt.set(id, now);
      } else if (Math.abs(p.lat - v.lat) > eps || Math.abs(p.lon - v.lon) > eps) {
        vehicleLastMovedAt.set(id, now);
      } else if (!vehicleLastMovedAt.has(id)) {
        vehicleLastMovedAt.set(id, now);
      }
    }
    for (const id of vehicleLastMovedAt.keys()) {
      if (!map.has(id)) vehicleLastMovedAt.delete(id);
    }

    const patch = {
      vehicles: map,
      vehicleCount: { bus, rail, total: map.size },
      lastPollTime: new Date().toISOString(),
      // Keep the same Map reference — Zustand will still notify subscribers
      // because `vehicles` (the new Map above) is a new reference, which is
      // the field that drives re-renders. vehicleLastMovedAt is only read via
      // getState() in tooltip callbacks, so a stable reference is fine.
      vehicleLastMovedAt,
    };
    const sel = prev.selectedVehicle;
    if (sel?.id != null && map.has(sel.id)) {
      patch.selectedVehicle = map.get(sel.id);
    }
    set(patch);
  },

  setRoutes: (routes) => set({ routes, routesLoaded: true }),

  // Apply an incremental delta from the server SSE stream.
  // Mutates the existing vehicles Map in place and creates a new reference so
  // Zustand notifies subscribers. Much cheaper than replacing the full Map.
  applyVehicleDelta: ({ changed = [], removed = [], timestamp }) => {
    const prev = get();
    const map = new Map(prev.vehicles); // shallow clone — entries are shared
    const vehicleLastMovedAt = prev.vehicleLastMovedAt;
    const eps = 1e-6;
    const now = Date.now();
    let bus = prev.vehicleCount.bus;
    let rail = prev.vehicleCount.rail;

    for (const v of changed) {
      const p = map.get(v.id);
      if (!p) {
        if (v.agency === 'lametro-rail') rail++; else bus++;
        vehicleLastMovedAt.set(v.id, now);
      } else if (Math.abs(p.lat - v.lat) > eps || Math.abs(p.lon - v.lon) > eps) {
        vehicleLastMovedAt.set(v.id, now);
      }
      map.set(v.id, v);
    }
    for (const id of removed) {
      const v = map.get(id);
      if (v) { if (v.agency === 'lametro-rail') rail--; else bus--; }
      map.delete(id);
      vehicleLastMovedAt.delete(id);
    }

    const patch = {
      vehicles: map,
      vehicleCount: { bus, rail, total: map.size },
      lastPollTime: timestamp || new Date().toISOString(),
      vehicleLastMovedAt,
    };
    const sel = prev.selectedVehicle;
    if (sel?.id != null && map.has(sel.id)) {
      patch.selectedVehicle = map.get(sel.id);
    }
    set(patch);
  },

  selectRoute: (route) => set({
    selectedRoute: route,
    selectedStop: null,
    stopDetailOpen: false,
  }),

  selectStop: (stop) => set({
    selectedStop: stop,
    stopDetailOpen: !!stop,
  }),

  selectVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  clearSelection: () => set({
    selectedRoute: null,
    selectedStop: null,
    selectedVehicle: null,
    stopDetailOpen: false,
  }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchResults: (results) => set({ searchResults: results }),
  setFilter: (type) => set({ filters: { ...get().filters, type } }),

  setMapMode: (mode) => set({ mapMode: mode }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setShowAllRoutes: (value) => set({ showAllRoutes: value }),
  setShowTrafficCameras: (value) => set({ showTrafficCameras: value }),
  setMapClickLocation: (loc) => {
    // Pinning a location should surface the nearby panel.
    if (loc) set({ mapClickLocation: loc, sidebarTab: 'nearby', sidebarOpen: true });
    else set({ mapClickLocation: null });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  // Close the panel but keep the stop selected so the user can re-open it
  // without hunting down the stop again on the map (useful on mobile where the
  // detail panel covers the whole screen).
  closeStopDetail: () => set({ stopDetailOpen: false }),
  openStopDetail: () => set(s => ({ stopDetailOpen: !!s.selectedStop })),

  setAnimationMode: (mode) => {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('la-metro-animation-mode', mode); } catch { /* ignore */ }
    }
    set({ animationMode: mode });
  },

  setBooted: () => set({ booted: true }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  toggleStopDetail: () => set(s => ({
    stopDetailOpen: s.selectedStop ? !s.stopDetailOpen : false,
  })),

  toggleFavoriteRoute: (routeId) => {
    const favs = get().favorites;
    const routes = favs.routes.includes(routeId)
      ? favs.routes.filter(r => r !== routeId)
      : [...favs.routes, routeId];
    const updated = { ...favs, routes };
    localStorage.setItem('la-metro-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  toggleFavoriteStop: (stopId) => {
    const favs = get().favorites;
    const stops = favs.stops.includes(stopId)
      ? favs.stops.filter(s => s !== stopId)
      : [...favs.stops, stopId];
    const updated = { ...favs, stops };
    localStorage.setItem('la-metro-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  loadFavorites: () => {
    try {
      const stored = localStorage.getItem('la-metro-favorites');
      if (stored) set({ favorites: JSON.parse(stored) });
    } catch { /* ignore */ }
  },
}));

export default useStore;
