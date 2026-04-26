/**
 * Scheduler that polls Swiftly for vehicle positions and trip updates.
 * Stores results in-memory and notifies SSE clients.
 */

import { fetchVehiclePositions, fetchTripUpdates, AGENCIES } from './swiftly.js';

const VEHICLE_POLL_MS = 10_000;
const TRIP_UPDATE_POLL_MS = 30_000;
// Send a full snapshot every N polls so clients can self-heal after missing a delta.
const FULL_SNAPSHOT_EVERY = 6; // every ~60 s

// In-memory stores
const vehicleCache = new Map();
const tripUpdateCache = new Map();
// Snapshot of the last-sent vehicle states for delta computation.
const lastSentCache = new Map();

// SSE client connections
const sseClients = new Set();

let vehicleTimer = null;
let tripTimer = null;
let isPollingVehicles = false;
let isPollingTrips = false;
let lastVehiclePoll = null;
let lastTripPoll = null;
let vehiclePollCount = 0;
let tripPollCount = 0;
let vehiclePollCycle = 0;

export function getVehicles() {
  return Array.from(vehicleCache.values());
}

export function getVehicle(id) {
  return vehicleCache.get(id) || null;
}

export function searchVehicles(query, limit = 10) {
  const q = query.toLowerCase();
  const results = [];
  for (const v of vehicleCache.values()) {
    if (
      v.id.toLowerCase().includes(q) ||
      (v.label && v.label.toLowerCase().includes(q)) ||
      (v.routeId && v.routeId.toLowerCase().includes(q))
    ) {
      results.push(v);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function getTripUpdates() {
  return tripUpdateCache;
}

export function addSseClient(res) {
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

function broadcastToSse(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
      if (typeof client.flush === 'function') client.flush();
    } catch {
      sseClients.delete(client);
    }
  }
}

async function pollVehicles() {
  if (isPollingVehicles) return;
  isPollingVehicles = true;
  const start = Date.now();

  try {
    const results = await Promise.allSettled(
      AGENCIES.map(async (agency) => {
        const data = await fetchVehiclePositions(agency);
        return { agency, data };
      })
    );

    let totalCount = 0;
    for (const result of results) {
      if (result.status !== 'fulfilled') {
        console.error('[poller] Vehicle fetch failed:', result.reason?.message);
        continue;
      }
      const { agency, data } = result.value;
      if (!data?.entity) continue;

      for (const entity of data.entity) {
        const v = entity.vehicle;
        if (!v?.position) continue;

        const vehicleId = v.vehicle?.id || entity.id;
        const tripInfo = tripUpdateCache.get(vehicleId);

        vehicleCache.set(vehicleId, {
          id: vehicleId,
          label: v.vehicle?.label || vehicleId,
          lat: v.position.latitude,
          lon: v.position.longitude,
          speed: v.position.speed || 0,
          bearing: v.position.bearing ?? null,
          timestamp: parseInt(v.timestamp) || Date.now() / 1000,
          agency,
          routeId: v.trip?.routeId || tripInfo?.routeId || null,
          tripId: v.trip?.tripId || tripInfo?.tripId || null,
          directionId: v.trip?.directionId ?? tripInfo?.directionId ?? null,
        });
        totalCount++;
      }
    }

    // Clean stale vehicles (no update in 5 minutes)
    const staleThreshold = Date.now() / 1000 - 300;
    for (const [id, v] of vehicleCache) {
      if (v.timestamp < staleThreshold) vehicleCache.delete(id);
    }

    lastVehiclePoll = new Date().toISOString();
    vehiclePollCount = vehicleCache.size;
    vehiclePollCycle++;

    // Build delta: changed/new vehicles + removed ids.
    // Every FULL_SNAPSHOT_EVERY cycles send a full snapshot so new/recovering clients sync.
    const sendFull = vehiclePollCycle % FULL_SNAPSHOT_EVERY === 1;
    if (sendFull) {
      // Full snapshot — also reset the last-sent cache.
      lastSentCache.clear();
      const allVehicles = Array.from(vehicleCache.values());
      for (const v of allVehicles) lastSentCache.set(v.id, v);
      broadcastToSse('vehicles', {
        vehicles: allVehicles,
        timestamp: lastVehiclePoll,
        count: vehiclePollCount,
        full: true,
      });
    } else {
      const changed = [];
      const removed = [];
      for (const [id, v] of vehicleCache) {
        const prev = lastSentCache.get(id);
        if (!prev ||
            Math.abs(prev.lat - v.lat) > 1e-6 ||
            Math.abs(prev.lon - v.lon) > 1e-6 ||
            prev.bearing !== v.bearing ||
            prev.speed !== v.speed ||
            prev.routeId !== v.routeId) {
          changed.push(v);
          lastSentCache.set(id, v);
        }
      }
      for (const id of lastSentCache.keys()) {
        if (!vehicleCache.has(id)) {
          removed.push(id);
          lastSentCache.delete(id);
        }
      }
      broadcastToSse('vehiclesDelta', {
        changed,
        removed,
        timestamp: lastVehiclePoll,
        total: vehiclePollCount,
      });
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[poller] Vehicles: ${totalCount} fetched, ${vehicleCache.size} cached (${elapsed}s)`);
  } catch (err) {
    console.error('[poller] Vehicle poll error:', err.message);
  } finally {
    isPollingVehicles = false;
  }
}

async function pollTripUpdates() {
  if (isPollingTrips) return;
  isPollingTrips = true;

  try {
    const results = await Promise.allSettled(
      AGENCIES.map(async (agency) => {
        const data = await fetchTripUpdates(agency);
        return { agency, data };
      })
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') {
        console.error('[poller] Trip-updates fetch failed:', result.reason?.message);
        continue;
      }
      const { agency, data } = result.value;
      if (!data?.entity) continue;

      for (const entity of data.entity) {
        const tu = entity.tripUpdate;
        if (!tu?.vehicle?.id) continue;

        tripUpdateCache.set(tu.vehicle.id, {
          vehicleId: tu.vehicle.id,
          tripId: tu.trip?.tripId || null,
          routeId: tu.trip?.routeId || null,
          directionId: tu.trip?.directionId ?? null,
          startTime: tu.trip?.startTime || null,
          agency,
          stopTimeUpdates: tu.stopTimeUpdate || [],
        });
      }
    }

    lastTripPoll = new Date().toISOString();
    tripPollCount = tripUpdateCache.size;
    console.log(`[poller] Trip updates: ${tripUpdateCache.size} vehicles indexed`);
  } catch (err) {
    console.error('[poller] Trip-updates poll error:', err.message);
  } finally {
    isPollingTrips = false;
  }
}

export function startPoller() {
  console.log(`[poller] Starting — vehicles every ${VEHICLE_POLL_MS / 1000}s, trips every ${TRIP_UPDATE_POLL_MS / 1000}s`);

  // Poll trip updates first so vehicle enrichment works on first cycle
  pollTripUpdates();
  setTimeout(() => pollVehicles(), 2000);

  tripTimer = setInterval(pollTripUpdates, TRIP_UPDATE_POLL_MS);
  vehicleTimer = setInterval(pollVehicles, VEHICLE_POLL_MS);
}

export function stopPoller() {
  if (vehicleTimer) clearInterval(vehicleTimer);
  if (tripTimer) clearInterval(tripTimer);
  vehicleTimer = null;
  tripTimer = null;
  console.log('[poller] Stopped');
}

export function getPollerStatus() {
  return {
    lastVehiclePoll,
    lastTripPoll,
    vehicleCount: vehiclePollCount,
    tripUpdateCount: tripPollCount,
    sseClients: sseClients.size,
    isPollingVehicles,
    isPollingTrips,
  };
}
