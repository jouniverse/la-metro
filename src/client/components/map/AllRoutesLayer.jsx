import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { getAllRouteShapes } from '../../lib/api.js';
import { getRouteDisplayColor } from '../../lib/utils.js';

// Cache the fetched data for the session so toggling is instant.
let cachedShapes = null;

export default function AllRoutesLayer() {
  const map = useMap();
  const showAllRoutes = useStore(s => s.showAllRoutes);
  const selectedRoute = useStore(s => s.selectedRoute);
  const selectRoute = useStore(s => s.selectRoute);
  const layerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!showAllRoutes) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const render = (shapes) => {
      if (cancelled) return;
      const group = L.layerGroup();
      const selectedId = selectedRoute?.routeId;

      for (const r of shapes) {
        if (!r.coordinates || r.coordinates.length < 2) continue;
        const latlngs = r.coordinates.map(([lon, lat]) => [lat, lon]);
        const color = getRouteDisplayColor({
          routeId: r.routeId,
          agencyKey: r.agencyKey,
          color: r.color,
          type: r.type,
        });
        const isSelected = r.routeId === selectedId;
        const line = L.polyline(latlngs, {
          color,
          weight: isSelected ? 3 : 1.2,
          opacity: isSelected ? 0.9 : 0.45,
          interactive: true,
          renderer: L.canvas({ padding: 0.3 }),
        });
        line.bindTooltip(
          `<div class="text-xs font-mono">
            <span class="font-bold">${r.shortName || r.routeId}</span>
            ${r.longName ? ` — ${r.longName}` : ''}
          </div>`,
          { sticky: true, direction: 'top', className: '' }
        );
        line.on('click', () => {
          selectRoute({
            agencyKey: r.agencyKey,
            routeId: r.routeId,
            shortName: r.shortName,
            longName: r.longName,
            type: r.type,
            typeName: r.type <= 1 ? 'rail' : 'bus',
            color: r.color,
            textColor: r.textColor,
          });
        });
        line.on('mouseover', () => line.setStyle({ weight: 3, opacity: 0.95 }));
        line.on('mouseout', () => {
          const reSel = r.routeId === useStore.getState().selectedRoute?.routeId;
          line.setStyle({ weight: reSel ? 3 : 1.2, opacity: reSel ? 0.9 : 0.45 });
        });
        line.addTo(group);
      }
      group.addTo(map);
      layerRef.current = group;
    };

    if (cachedShapes) {
      render(cachedShapes);
    } else {
      getAllRouteShapes()
        .then(data => {
          cachedShapes = data.routes || [];
          render(cachedShapes);
        })
        .catch(err => {
          console.error('Failed to load all route shapes:', err);
          setError(err.message);
        });
    }

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [showAllRoutes, selectedRoute, map, selectRoute]);

  return null;
}
