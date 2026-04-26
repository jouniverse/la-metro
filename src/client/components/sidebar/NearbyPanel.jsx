import { useState, useEffect, useCallback } from 'react';
import useStore from '../../lib/store.js';
import { getNearbyPredictions } from '../../lib/api.js';
import { formatCountdown } from '../../lib/utils.js';

export default function NearbyPanel() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [origin, setOrigin] = useState(null); // { lat, lon, source: 'me' | 'map' }
  const selectStop = useStore(s => s.selectStop);
  const setMapCenter = useStore(s => s.setMapCenter);
  const mapClickLocation = useStore(s => s.mapClickLocation);
  const setMapClickLocation = useStore(s => s.setMapClickLocation);

  const fetchFor = useCallback(async (lat, lon, source) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNearbyPredictions(lat, lon, 800);
      setPredictions(data.predictions || []);
      setOrigin({ lat, lon, source });
    } catch {
      setError('Failed to load nearby predictions');
    }
    setLoading(false);
  }, []);

  const locate = useCallback(() => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not available');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setMapClickLocation(null);
        fetchFor(latitude, longitude, 'me');
      },
      () => {
        setError('Location access denied. Click the map to pick a location instead.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [fetchFor, setMapCenter, setMapClickLocation]);

  // React to map-click pin
  useEffect(() => {
    if (mapClickLocation) {
      fetchFor(mapClickLocation.lat, mapClickLocation.lon, 'map');
    }
  }, [mapClickLocation, fetchFor]);

  useEffect(() => {
    if (!mapClickLocation) locate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceLabel = origin?.source === 'map' ? 'FROM PIN' : origin?.source === 'me' ? 'FROM YOU' : '';

  const byStop = {};
  for (const p of predictions) {
    const key = `${p.stopId}`;
    if (!byStop[key]) byStop[key] = { stopName: p.stopName, stopId: p.stopId, stopCode: p.stopCode, distance: p.distanceToStop, routes: [] };
    byStop[key].routes.push(p);
  }
  const stops = Object.values(byStop).sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--color-outline-variant)] flex flex-col gap-1.5">
        <div className="text-[10px] tracking-[0.12em] text-[var(--color-outline)] uppercase">
          Tip: click the map to scan that location.
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={locate}
            className="flex-1 px-2 py-1 text-[10px] tracking-[0.12em] uppercase border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            ▲ LOCATE ME
          </button>
          <button
            type="button"
            onClick={() => setMapClickLocation(null)}
            disabled={!mapClickLocation}
            className="flex-1 px-2 py-1 text-[10px] tracking-[0.12em] uppercase border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40"
          >
            ✕ CLEAR PIN
          </button>
        </div>
        {origin && (
          <div className="text-[10px] tracking-[0.12em] text-[var(--color-outline)] uppercase">
            {sourceLabel}: {origin.lat.toFixed(4)}, {origin.lon.toFixed(4)}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-24 text-xs text-[var(--color-outline)] uppercase tracking-wider">
          <span className="pulse-glow">Scanning nearby stops...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 text-xs text-[var(--color-error)]">{error}</div>
      )}

      {!loading && !error && stops.length === 0 && (
        <div className="p-6 text-center text-xs text-[var(--color-outline)] uppercase tracking-wider">
          No stops within 800m.
        </div>
      )}

      {stops.map(stop => (
        <div key={stop.stopId} className="border-b border-[var(--color-outline-variant)]">
          <button
            type="button"
            onClick={() => selectStop({
              agencyKey: 'lametro',
              stopId: stop.stopId,
              stopName: stop.stopName,
              stopCode: stop.stopCode,
            })}
            className="w-full text-left px-3 py-2 hover:bg-[var(--color-surface-container)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-on-surface)] font-medium">{stop.stopName}</span>
              {stop.distance != null && (
                <span className="text-[10px] text-[var(--color-outline)]">
                  {Math.round(stop.distance)}m
                </span>
              )}
            </div>
            <div className="mt-1 space-y-0.5">
              {stop.routes.map((r, i) => {
                const nextPred = r.destinations?.flatMap(d => d.predictions || []).sort((a, b) => a.sec - b.sec)[0];
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-[var(--color-primary)] font-bold min-w-[2rem]">{r.routeShortName}</span>
                    <span className="text-[var(--color-outline)] truncate flex-1">
                      {r.destinations?.[0]?.headsign || ''}
                    </span>
                    {nextPred && (
                      <span className="text-[var(--color-secondary)] font-bold">
                        {nextPred.min <= 0 ? 'NOW' : formatCountdown(nextPred.sec)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
