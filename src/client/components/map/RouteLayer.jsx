import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { getRoute } from '../../lib/api.js';
import { getRouteDisplayColor } from '../../lib/utils.js';

export default function RouteLayer() {
  const map = useMap();
  const selectedRoute = useStore(s => s.selectedRoute);
  const layerRef = useRef(null);

  useEffect(() => {
    // Clear previous
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!selectedRoute) return;

    const { agencyKey, routeId } = selectedRoute;
    const color = getRouteDisplayColor(selectedRoute);

    getRoute(agencyKey, routeId)
      .then(data => {
        if (!data.shapes?.length) return;

        const group = L.layerGroup();

        for (const shape of data.shapes) {
          if (!shape.coordinates?.length) continue;
          const latLngs = shape.coordinates.map(([lon, lat]) => [lat, lon]);

          // Glow layer
          L.polyline(latLngs, {
            color,
            weight: 6,
            opacity: 0.2,
            interactive: false,
          }).addTo(group);

          // Main line
          L.polyline(latLngs, {
            color,
            weight: 3,
            opacity: 0.8,
            interactive: false,
          }).addTo(group);
        }

        group.addTo(map);
        layerRef.current = group;

        // Fit bounds
        const allCoords = data.shapes.flatMap(s =>
          s.coordinates.map(([lon, lat]) => [lat, lon])
        );
        if (allCoords.length) {
          map.fitBounds(L.latLngBounds(allCoords), { padding: [60, 60] });
        }
      })
      .catch(err => console.error('Failed to load route shape:', err));

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [selectedRoute, map]);

  return null;
}
