import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { getStop } from '../../lib/api.js';

/**
 * Renders an emphasized marker for the currently selected stop, regardless of
 * whether a route is selected. This is what guarantees stops chosen via search
 * are visible on the map (StopMarkers only renders stops of the active route).
 */
function makeSelectedIcon() {
  const fill = '#00c1ff';
  const svg = `<svg width="26" height="26" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="0" x2="8" y2="16" stroke="${fill}" stroke-width="1" opacity="0.9"/>
    <line x1="0" y1="8" x2="16" y2="8" stroke="${fill}" stroke-width="1" opacity="0.9"/>
    <rect x="5" y="5" width="6" height="6" fill="${fill}" opacity="0.95"/>
    <rect x="3" y="3" width="10" height="10" fill="none" stroke="${fill}" stroke-width="1" opacity="0.7"/>
  </svg>`;
  return L.divIcon({
    html: `<div class="selected-vehicle-pulse" style="filter: drop-shadow(0 0 10px ${fill})">${svg}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: '',
  });
}

export default function SelectedStopMarker() {
  const map = useMap();
  const selectedStop = useStore(s => s.selectedStop);
  const selectedRoute = useStore(s => s.selectedRoute);
  const markerRef = useRef(null);

  useEffect(() => {
    // Clear any previous marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (!selectedStop) return;
    // When a route is selected, StopMarkers already emphasises the stop if it
    // belongs to that route. Skip to avoid double-stacking markers.
    if (selectedRoute) return;

    const render = (lat, lon, name) => {
      const marker = L.marker([lat, lon], {
        icon: makeSelectedIcon(),
        interactive: false,
        zIndexOffset: 600,
      });
      if (name) {
        marker.bindTooltip(
          `<div class="text-xs font-mono">${name}</div>`,
          { direction: 'top', offset: [0, -8], className: '', permanent: false }
        );
      }
      marker.addTo(map);
      markerRef.current = marker;
    };

    // If the search result already carries coords, use them; otherwise look them up.
    if (selectedStop.lat != null && selectedStop.lon != null) {
      render(selectedStop.lat, selectedStop.lon, selectedStop.stopName);
    } else if (selectedStop.agencyKey && selectedStop.stopId) {
      getStop(selectedStop.agencyKey, selectedStop.stopId)
        .then(info => {
          if (info?.stop_lat != null && info?.stop_lon != null) {
            render(info.stop_lat, info.stop_lon, info.stop_name || selectedStop.stopName);
          }
        })
        .catch(err => console.error('Failed to look up selected stop:', err));
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [selectedStop, selectedRoute, map]);

  return null;
}
