import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';
import { LA_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../../lib/constants.js';
import VehicleLayer from './VehicleLayer.jsx';
import RouteLayer from './RouteLayer.jsx';
import StopMarkers from './StopMarkers.jsx';
import AllRoutesLayer from './AllRoutesLayer.jsx';
import SelectedStopMarker from './SelectedStopMarker.jsx';
import MapControls from './MapControls.jsx';
import TrafficCameraLayer from './TrafficCameraLayer.jsx';
import 'leaflet/dist/leaflet.css';

function MapModeController() {
  const mapMode = useStore(s => s.mapMode);
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (mapMode === 'satellite') container.classList.add('satellite-shader');
    else container.classList.remove('satellite-shader');
  }, [mapMode, map]);

  return null;
}

function FlyToHandler() {
  const map = useMap();
  const selectedStopId = useStore(s => s.selectedStop?.stopId);
  const selectedVehicleId = useStore(s => s.selectedVehicle?.id);
  const mapCenter = useStore(s => s.mapCenter);
  const lastFlownStopId = useRef(null);
  const lastFlownVehicleId = useRef(null);

  // Fly when the *user picks a new stop* — not when the same stop’s object
  // instance updates from the API, and not on every vehicle poll.
  useEffect(() => {
    if (!selectedStopId) {
      lastFlownStopId.current = null;
      return;
    }
    if (lastFlownStopId.current === selectedStopId) return;
    lastFlownStopId.current = selectedStopId;
    const s = useStore.getState().selectedStop;
    if (s?.lat && s?.lon) {
      map.flyTo([s.lat, s.lon], 15, { duration: 0.8 });
    }
  }, [selectedStopId, map]);

  useEffect(() => {
    if (!selectedVehicleId) {
      lastFlownVehicleId.current = null;
      return;
    }
    if (lastFlownVehicleId.current === selectedVehicleId) return;
    lastFlownVehicleId.current = selectedVehicleId;
    const v = useStore.getState().selectedVehicle;
    if (v?.lat != null && v?.lon != null) {
      map.flyTo([v.lat, v.lon], Math.max(15, map.getZoom()), { duration: 0.8 });
    }
  }, [selectedVehicleId, map]);

  useEffect(() => {
    if (mapCenter) map.flyTo(mapCenter, 14, { duration: 0.8 });
  }, [mapCenter, map]);

  return null;
}

/**
 * Click-to-pin a nearby-search location when the NEARBY tab is active.
 * Also renders a marker for the pinned location.
 */
function MapClickHandler() {
  const sidebarTab = useStore(s => s.sidebarTab);
  const mapClickLocation = useStore(s => s.mapClickLocation);
  const setMapClickLocation = useStore(s => s.setMapClickLocation);
  const markerRef = useRef(null);
  const map = useMap();

  useMapEvents({
    click: (e) => {
      if (sidebarTab !== 'nearby') return;
      // Ignore clicks on interactive children (leaflet fires if target is map itself)
      setMapClickLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (mapClickLocation) {
      const icon = L.divIcon({
        html: `<div class="selected-vehicle-pulse" style="width:28px;height:28px;border:2px solid #5bff9a;border-radius:50%;background:rgba(91,255,154,0.15);box-shadow:0 0 12px rgba(91,255,154,0.7)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: '',
      });
      const m = L.marker([mapClickLocation.lat, mapClickLocation.lon], { icon, interactive: false });
      m.addTo(map);
      markerRef.current = m;
    }
    return () => {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    };
  }, [mapClickLocation, map]);

  return null;
}

export default function MapView() {
  const mapMode = useStore(s => s.mapMode);
  const tileConfig = TILE_LAYERS[mapMode];

  return (
    <MapContainer
      center={LA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      zoomControl={false}
      preferCanvas={true}
    >
      <TileLayer
        key={mapMode}
        url={tileConfig.url}
        attribution={tileConfig.attribution}
        maxZoom={tileConfig.maxZoom}
      />
      <MapModeController />
      <FlyToHandler />
      <MapClickHandler />
      <AllRoutesLayer />
      <VehicleLayer />
      <RouteLayer />
      <StopMarkers />
      <SelectedStopMarker />
      <TrafficCameraLayer />
      <MapControls />
    </MapContainer>
  );
}
