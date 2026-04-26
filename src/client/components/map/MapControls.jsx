import { useMap } from 'react-leaflet';
import useStore from '../../lib/store.js';

export default function MapControls() {
  const map = useMap();
  const mapMode = useStore(s => s.mapMode);
  const setMapMode = useStore(s => s.setMapMode);
  const setMapCenter = useStore(s => s.setMapCenter);

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
      },
      () => console.warn('Geolocation denied')
    );
  };

  return (
    <div className="absolute top-14 right-3 z-[1000] flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold hover:bg-[var(--color-surface-container-high)] transition-colors"
        title="Zoom in"
      >+</button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold hover:bg-[var(--color-surface-container-high)] transition-colors"
        title="Zoom out"
      >&minus;</button>

      <div className="h-1" />

      <button
        onClick={handleLocate}
        className="w-8 h-8 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-tertiary)] flex items-center justify-center text-xs hover:bg-[var(--color-surface-container-high)] transition-colors"
        title="My location"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="3" />
          <line x1="7" y1="0" x2="7" y2="3" />
          <line x1="7" y1="11" x2="7" y2="14" />
          <line x1="0" y1="7" x2="3" y2="7" />
          <line x1="11" y1="7" x2="14" y2="7" />
        </svg>
      </button>

      <button
        onClick={() => setMapMode(mapMode === 'street' ? 'satellite' : 'street')}
        className="w-8 h-8 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] flex items-center justify-center text-[9px] font-bold uppercase hover:bg-[var(--color-surface-container-high)] transition-colors"
        title={`Switch to ${mapMode === 'street' ? 'satellite' : 'street'} view`}
      >
        {mapMode === 'street' ? 'SAT' : 'MAP'}
      </button>
    </div>
  );
}
