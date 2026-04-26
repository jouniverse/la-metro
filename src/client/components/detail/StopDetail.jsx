import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useStore from '../../lib/store.js';
import { useCompactLayout } from '../../lib/layout.js';
import { getPredictions, getStop } from '../../lib/api.js';
import PredictionRow from './PredictionRow.jsx';

export default function StopDetail() {
  const compact = useCompactLayout();
  const selectedStop = useStore(s => s.selectedStop);
  const closeStopDetail = useStore(s => s.closeStopDetail);
  const favorites = useStore(s => s.favorites);
  const toggleFavoriteStop = useStore(s => s.toggleFavoriteStop);

  const [stopInfo, setStopInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedStop) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Fetch predictions
        const predData = await getPredictions(selectedStop.stopId, selectedStop.agencyKey);
        setPredictions(predData.predictions || []);

        // Fetch stop details (routes served, etc.)
        if (selectedStop.agencyKey) {
          try {
            const info = await getStop(selectedStop.agencyKey, selectedStop.stopId);
            setStopInfo(info);
          } catch { /* stop detail is optional */ }
        }
      } catch (err) {
        setError('Failed to load predictions');
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [selectedStop?.stopId]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeStopDetail();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeStopDetail]);

  if (!selectedStop) return null;

  const isFav = favorites.stops.includes(selectedStop.stopId);

  return (
    <motion.div
      initial={{ x: 384, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 384, opacity: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className={
        compact
          ? 'absolute inset-0 z-[5100] order-2 flex w-full max-w-full shrink-0 flex-col overflow-hidden border-l border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)] pt-[env(safe-area-inset-top)]'
          : 'relative z-[5100] order-2 flex h-full w-96 shrink-0 flex-col overflow-hidden border-l border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]'
      }
    >
      {/* Corner brackets */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--color-outline)]" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--color-outline)]" />

      {/* Header */}
      <div className="p-3 border-b border-[var(--color-outline-variant)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.15em] text-[var(--color-outline)] uppercase mb-1">
              Stop #{selectedStop.stopCode || selectedStop.stopId}
            </div>
            <h2 className="text-sm font-bold text-[var(--color-on-surface)] leading-tight">
              {selectedStop.stopName}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleFavoriteStop(selectedStop.stopId)}
              className={`text-sm ${isFav ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline-variant)] hover:text-[var(--color-outline)]'}`}
            >
              {isFav ? '★' : '☆'}
            </button>
            <button
              onClick={closeStopDetail}
              className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-xs ml-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Routes served */}
        {stopInfo?.routes?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {stopInfo.routes.map(r => (
              <span
                key={`${r.agencyKey}-${r.routeId}`}
                className="px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: r.color ? `#${r.color}` : 'var(--color-primary)',
                  color: '#000',
                }}
              >
                {r.shortName || r.routeId}
              </span>
            ))}
          </div>
        )}

        {/* Live badge */}
        <div className="mt-2 flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase">
          <span className="inline-flex items-center gap-1 text-[var(--color-secondary)]">
            <span className="w-1.5 h-1.5 bg-[var(--color-secondary)] rounded-full pulse-glow" />
            LIVE predictions
          </span>
          <span className="text-[var(--color-outline)]">· refresh 30s</span>
        </div>
      </div>

      {/* Predictions */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-[var(--color-outline)] uppercase tracking-wider">
            <span className="pulse-glow">Loading predictions...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-[var(--color-error)]">{error}</div>
        ) : predictions.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-outline)] uppercase tracking-wider">
            No predictions available
          </div>
        ) : (
          <div>
            {predictions.map((pred, idx) => {
              const destinations = Array.isArray(pred.destinations) ? pred.destinations : [];
              return (
                <div key={`${pred.routeId || pred.routeShortName || idx}`} className="border-b border-[var(--color-outline-variant)]">
                  <div className="px-3 py-1.5 bg-[var(--color-surface-container-low)] flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                    >
                      {pred.routeShortName || pred.routeName || pred.routeId}
                    </span>
                    <span className="text-[10px] text-[var(--color-outline)] uppercase tracking-wider truncate">
                      {pred.routeName || pred.stopName}
                    </span>
                  </div>

                  {destinations.length === 0 ? (
                    <div className="px-3 py-2 text-[10px] text-[var(--color-outline)] italic">No upcoming arrivals</div>
                  ) : destinations.map((dest, dIdx) => {
                    const destPreds = Array.isArray(dest.predictions) ? dest.predictions : [];
                    return (
                      <div key={dIdx} className="px-3 py-2">
                        <div className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <span className="text-[var(--color-outline)]">→</span>
                          <span className="truncate">{dest.headsign || '—'}</span>
                        </div>
                        {destPreds.length > 0 ? (
                          <div className="space-y-1">
                            {destPreds.map((p, pIdx) => (
                              <PredictionRow key={`${p.vehicleId || pIdx}-${p.sec}`} prediction={p} isFirst={pIdx === 0} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[var(--color-outline)] italic">No upcoming arrivals</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coordinate footer */}
      <div className="px-3 py-1 border-t border-[var(--color-outline-variant)] text-[9px] text-[var(--color-outline)] tracking-wider font-mono">
        LAT: {selectedStop.lat?.toFixed(5) || '—'} LON: {selectedStop.lon?.toFixed(5) || '—'}
      </div>
    </motion.div>
  );
}
