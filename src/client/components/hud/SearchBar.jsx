import { useState, useCallback, useRef, useEffect } from 'react';
import useStore from '../../lib/store.js';
import { search } from '../../lib/api.js';
import { debounce, getRouteDisplayColor } from '../../lib/utils.js';

export default function SearchBar({ compact = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const selectRoute = useStore(s => s.selectRoute);
  const selectStop = useStore(s => s.selectStop);
  const selectVehicle = useStore(s => s.selectVehicle);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const doSearch = useCallback(
    debounce(async (q) => {
      if (q.length < 2) { setResults(null); return; }
      try {
        const data = await search(q);
        setResults(data);
        setOpen(true);
      } catch { setResults(null); }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    doSearch(val);
  };

  const handleSelect = (type, item) => {
    if (type === 'route') selectRoute(item);
    else if (type === 'stop') selectStop(item);
    else if (type === 'vehicle') selectVehicle(item);
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasResults = results && (results.routes.length > 0 || results.stops.length > 0 || (results.vehicles?.length > 0));

  const placeholder = compact ? 'Search…' : 'Search routes, stops, vehicles  [/]';
  const inputClass = compact
    ? 'min-w-0 w-full bg-transparent text-[16px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)]'
    : 'w-44 bg-transparent text-[16px] text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-outline)] sm:w-60 sm:text-xs';

  return (
    <div className={`relative ${compact ? 'w-full' : ''}`} ref={containerRef}>
      <div
        className={`flex items-center gap-1.5 border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-2 py-1 ${
          compact ? 'w-full' : ''
        }`}
      >
        <span className="shrink-0 text-xs text-[var(--color-outline)]">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          placeholder={placeholder}
          // `text-[16px]` on mobile prevents iOS Safari from auto-zooming the
          // viewport when the input gains focus. Desktop uses text-xs in non-compact.
          className={inputClass}
        />
      </div>

      {open && hasResults && (
        <div
          className={`absolute top-full right-0 z-[1200] mt-1 max-h-96 overflow-y-auto border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] shadow-lg ${
            compact ? 'left-0 w-full max-w-none' : 'w-80'
          }`}
        >
          {results.routes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] tracking-[0.15em] text-[var(--color-outline)] uppercase border-b border-[var(--color-outline-variant)]">
                Routes
              </div>
              {results.routes.map(r => (
                <button
                  type="button"
                  key={`${r.agencyKey}-${r.routeId}`}
                  onClick={() => handleSelect('route', r)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-surface-container-high)] flex items-center gap-2 text-xs"
                >
                  <span
                    className="w-6 h-5 flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: getRouteDisplayColor(r), color: '#000' }}
                  >
                    {r.shortName?.slice(0, 4) || '?'}
                  </span>
                  <span className="text-[var(--color-on-surface)] truncate">{r.longName || r.shortName}</span>
                  <span className="ml-auto text-[10px] text-[var(--color-outline)] uppercase shrink-0">{r.typeName}</span>
                </button>
              ))}
            </div>
          )}
          {results.stops.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] tracking-[0.15em] text-[var(--color-outline)] uppercase border-b border-[var(--color-outline-variant)]">
                Stops
              </div>
              {results.stops.map(s => (
                <button
                  type="button"
                  key={`${s.agencyKey}-${s.stopId}`}
                  onClick={() => handleSelect('stop', s)}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-surface-container-high)] text-xs text-[var(--color-on-surface)]"
                >
                  {s.stopName}
                  <span className="ml-2 text-[var(--color-outline)]">#{s.stopCode || s.stopId}</span>
                </button>
              ))}
            </div>
          )}
          {results.vehicles && results.vehicles.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] tracking-[0.15em] text-[var(--color-outline)] uppercase border-b border-[var(--color-outline-variant)]">
                Vehicles
              </div>
              {results.vehicles.map(v => {
                const isRail = v.agency === 'lametro-rail';
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => handleSelect('vehicle', v)}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--color-surface-container-high)] flex items-center gap-2 text-xs"
                  >
                    <span
                      className="w-6 h-5 flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: isRail ? '#00c1ff' : '#ff9d00', color: '#000' }}
                    >
                      {isRail ? 'R' : 'B'}
                    </span>
                    <span className="text-[var(--color-on-surface)]">#{v.label || v.id}</span>
                    <span className="ml-auto text-[10px] text-[var(--color-outline)] uppercase shrink-0">
                      {v.routeId ? `RT ${v.routeId}` : 'no route'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
