import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { getRouteStops } from '../../lib/api.js';

function makeStopIcon(isSelected) {
  const size = isSelected ? 22 : 16;
  const fill = isSelected ? '#00c1ff' : '#ff9d00';
  const crossOpacity = isSelected ? 0.9 : 0.6;
  const crossColor = isSelected ? '#00c1ff' : '#a28d79';

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="0" x2="8" y2="16" stroke="${crossColor}" stroke-width="1" opacity="${crossOpacity}"/>
    <line x1="0" y1="8" x2="16" y2="8" stroke="${crossColor}" stroke-width="1" opacity="${crossOpacity}"/>
    <rect x="5" y="5" width="6" height="6" fill="${fill}" opacity="0.9"/>
    ${isSelected ? `<rect x="3" y="3" width="10" height="10" fill="none" stroke="${fill}" stroke-width="1" opacity="0.6"/>` : ''}
  </svg>`;

  return L.divIcon({
    html: `<div class="${isSelected ? 'selected-vehicle-pulse' : ''}" style="filter: drop-shadow(0 0 ${isSelected ? 8 : 2}px ${fill})">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  });
}

export default function StopMarkers() {
  const map = useMap();
  const selectedRoute = useStore(s => s.selectedRoute);
  const selectedStop = useStore(s => s.selectedStop);
  const selectStop = useStore(s => s.selectStop);
  const layerRef = useRef(null);
  // Keep a lookup of markers by stopId so we can re-style on selection
  const markerByStopId = useRef(new Map());

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    markerByStopId.current.clear();

    if (!selectedRoute) return;

    const { agencyKey, routeId } = selectedRoute;

    getRouteStops(agencyKey, routeId)
      .then(data => {
        const stops = data.stops || [];
        if (!stops.length) return;

        const group = L.layerGroup();

        for (const stop of stops) {
          const isSelected = selectedStop?.stopId === stop.stop_id;
          const marker = L.marker([stop.stop_lat, stop.stop_lon], {
            icon: makeStopIcon(isSelected),
            interactive: true,
          });

          marker.bindTooltip(
            `<div class="text-xs font-mono">${stop.stop_name}</div>`,
            { direction: 'top', offset: [0, -6], className: '' }
          );

          marker.on('click', () => {
            selectStop({
              agencyKey,
              stopId: stop.stop_id,
              stopName: stop.stop_name,
              stopCode: stop.stop_code,
              lat: stop.stop_lat,
              lon: stop.stop_lon,
            });
          });

          marker.addTo(group);
          markerByStopId.current.set(stop.stop_id, marker);
        }

        group.addTo(map);
        layerRef.current = group;
      })
      .catch(err => console.error('Failed to load route stops:', err));

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      markerByStopId.current.clear();
    };
  }, [selectedRoute, map]);

  // Re-style when selected stop changes (without re-fetching)
  useEffect(() => {
    for (const [stopId, marker] of markerByStopId.current) {
      const isSelected = selectedStop?.stopId === stopId;
      marker.setIcon(makeStopIcon(isSelected));
      if (isSelected) marker.setZIndexOffset(500); else marker.setZIndexOffset(0);
    }
  }, [selectedStop]);

  return null;
}
