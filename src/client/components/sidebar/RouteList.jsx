import { useMemo, useState } from 'react';
import useStore from '../../lib/store.js';
import { getRouteDisplayColor } from '../../lib/utils.js';
import { RAIL_COLORS } from '../../lib/constants.js';

export default function RouteList() {
  const routes = useStore(s => s.routes);
  const filterType = useStore(s => s.filters.type);
  const selectedRoute = useStore(s => s.selectedRoute);
  const selectRoute = useStore(s => s.selectRoute);
  const vehicles = useStore(s => s.vehicles);
  const favorites = useStore(s => s.favorites);
  const toggleFavoriteRoute = useStore(s => s.toggleFavoriteRoute);
  const [localSearch, setLocalSearch] = useState('');

  // Count vehicles per route
  const vehiclesByRoute = useMemo(() => {
    const map = {};
    for (const [, v] of vehicles) {
      if (v.routeId) {
        map[v.routeId] = (map[v.routeId] || 0) + 1;
      }
    }
    return map;
  }, [vehicles]);

  const filtered = useMemo(() => {
    let list = routes;
    if (filterType === 'bus') list = list.filter(r => r.type > 1);
    if (filterType === 'rail') list = list.filter(r => r.type <= 1);
    if (localSearch) {
      const q = localSearch.toLowerCase();
      list = list.filter(r =>
        (r.shortName || '').toLowerCase().includes(q) ||
        (r.longName || '').toLowerCase().includes(q) ||
        (r.desc || '').toLowerCase().includes(q)
      );
    }

    // Sort: favorites first, then rail, then by name
    return list.sort((a, b) => {
      const aFav = favorites.routes.includes(`${a.agencyKey}:${a.routeId}`) ? 0 : 1;
      const bFav = favorites.routes.includes(`${b.agencyKey}:${b.routeId}`) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      if (a.type <= 1 && b.type > 1) return -1;
      if (a.type > 1 && b.type <= 1) return 1;
      return (a.shortName || '').localeCompare(b.shortName || '', undefined, { numeric: true });
    });
  }, [routes, filterType, localSearch, favorites.routes]);

  return (
    <div className="flex flex-col">
      {/* Filter input */}
      <div className="p-2 border-b border-[var(--color-outline-variant)]">
        <input
          type="text"
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Filter routes..."
          className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] px-2 py-1 text-[16px] sm:text-xs text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 text-[10px] tracking-[0.12em] text-[var(--color-outline)] uppercase">
        {filtered.length} routes
      </div>

      {/* Route cards */}
      {filtered.map(route => {
        const isSelected = selectedRoute?.routeId === route.routeId && selectedRoute?.agencyKey === route.agencyKey;
        const color = getRouteDisplayColor(route);
        const activeVehicles = vehiclesByRoute[route.routeId] || 0;
        const favKey = `${route.agencyKey}:${route.routeId}`;
        const isFav = favorites.routes.includes(favKey);

        return (
          <div
            key={`${route.agencyKey}-${route.routeId}`}
            className={`w-full border-b border-[var(--color-outline-variant)] flex items-stretch transition-colors ${
              isSelected
                ? 'bg-[var(--color-surface-container-high)]'
                : 'hover:bg-[var(--color-surface-container)]'
            }`}
          >
            <button
              type="button"
              onClick={() => selectRoute(isSelected ? null : route)}
              className="flex-1 text-left px-3 py-2 flex items-center gap-2 min-w-0"
            >
              <span
                className="min-w-[2.5rem] h-6 flex items-center justify-center text-[10px] font-bold shrink-0 px-1"
                style={{ backgroundColor: color, color: route.textColor ? `#${route.textColor}` : '#000' }}
              >
                {route.shortName || route.routeId?.slice(0, 4)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[var(--color-on-surface)] truncate">
                  {route.longName || route.desc || route.shortName}
                </div>
                <div className="text-[10px] text-[var(--color-outline)] uppercase flex items-center gap-2">
                  <span>{route.typeName}</span>
                  {activeVehicles > 0 && (
                    <span className="text-[var(--color-secondary)]">{activeVehicles} active</span>
                  )}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => toggleFavoriteRoute(favKey)}
              aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
              className={`px-3 text-sm ${isFav ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline-variant)] hover:text-[var(--color-outline)]'}`}
            >
              {isFav ? '★' : '☆'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
