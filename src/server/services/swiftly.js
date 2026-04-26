/**
 * Swiftly API client — fetches real-time GTFS-RT data.
 */

const BASE_URL = 'https://api.goswift.ly';

const AGENCIES = ['lametro', 'lametro-rail'];

export { AGENCIES };

function headers() {
  return {
    Accept: 'application/json, application/json; charset=utf-8',
    Authorization: process.env.SWIFTLY_API_KEY,
  };
}

export async function fetchVehiclePositions(agencyKey) {
  const url = `${BASE_URL}/real-time/${agencyKey}/gtfs-rt-vehicle-positions?format=json`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Swiftly vehicle-positions ${agencyKey}: ${res.status}`);
  return res.json();
}

export async function fetchTripUpdates(agencyKey) {
  const url = `${BASE_URL}/real-time/${agencyKey}/gtfs-rt-trip-updates?format=json`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Swiftly trip-updates ${agencyKey}: ${res.status}`);
  return res.json();
}

export async function fetchPredictions(agencyKey, stopId, number = 3) {
  const url = `${BASE_URL}/real-time/${agencyKey}/predictions?stop=${stopId}&number=${number}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: process.env.SWIFTLY_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Swiftly predictions ${agencyKey}/${stopId}: ${res.status}`);
  return res.json();
}

export async function fetchPredictionsNearby(agencyKey, lat, lon, radius = 500) {
  const url = `${BASE_URL}/real-time/${agencyKey}/predictions-near-location?lat=${lat}&lon=${lon}&radius=${radius}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: process.env.SWIFTLY_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Swiftly nearby ${agencyKey}: ${res.status}`);
  return res.json();
}

export async function fetchAgencyRoutes(agencyKey) {
  const url = `${BASE_URL}/info/${agencyKey}/routes`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: process.env.SWIFTLY_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Swiftly agency-routes ${agencyKey}: ${res.status}`);
  return res.json();
}
