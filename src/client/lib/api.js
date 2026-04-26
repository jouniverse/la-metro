const BASE = '/api';

async function fetchJson(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export function getVehicles(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchJson(`/vehicles${qs ? `?${qs}` : ''}`);
}

export function getRoutes() {
  return fetchJson('/routes');
}

export function getRoute(agencyKey, routeId) {
  return fetchJson(`/routes/${agencyKey}/${routeId}`);
}

export function getRouteStops(agencyKey, routeId) {
  return fetchJson(`/routes/${agencyKey}/${routeId}/stops`);
}

export function getAllRouteShapes() {
  return fetchJson('/routes/shapes/all');
}

export function getVehicleById(id) {
  return fetchJson(`/vehicles/${encodeURIComponent(id)}`);
}

export function getStop(agencyKey, stopId) {
  return fetchJson(`/stops/${agencyKey}/${stopId}`);
}

export function getPredictions(stopId, agency) {
  const qs = agency ? `?agency=${agency}` : '';
  return fetchJson(`/predictions/stop/${stopId}${qs}`);
}

export function getNearbyPredictions(lat, lon, radius = 500) {
  return fetchJson(`/predictions/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
}

export function search(query) {
  return fetchJson(`/search?q=${encodeURIComponent(query)}`);
}

export function getStatus() {
  return fetchJson('/status');
}

export function createVehicleStream(onMessage, onDelta, onError) {
  const source = new EventSource(`${BASE}/vehicles/stream`);

  // Full snapshot (sent on connect and every ~60 s)
  source.addEventListener('vehicles', (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage(data);
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  });

  // Incremental delta (sent every 10 s between full snapshots)
  source.addEventListener('vehiclesDelta', (e) => {
    try {
      const data = JSON.parse(e.data);
      onDelta?.(data);
    } catch (err) {
      console.error('SSE delta parse error:', err);
    }
  });

  source.addEventListener('connected', () => {
    console.log('[SSE] Connected');
  });

  // Browsers fire `error` while reconnecting too — only surface OFFLINE when
  // the EventSource is actually closed. Otherwise a brief network blip would
  // flip STATUS to OFFLINE even though the next poll succeeds automatically.
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) {
      console.error('[SSE] Connection closed');
      onError?.();
    }
  };

  return source;
}
