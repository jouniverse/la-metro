/**
 * GTFS static data query helpers.
 */

import { getDb } from '../db/database.js';

// Douglas-Peucker line simplification
function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
  return Math.sqrt((x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2);
}

function simplifyLine(points, epsilon = 0.00005) {
  if (points.length <= 2) return points;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = simplifyLine(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyLine(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

const shapeCache = new Map();
let allShapesCache = null;

export function getAllRoutes() {
  const db = getDb();
  return db.prepare(`
    SELECT agency_key, route_id, route_short_name, route_long_name,
           route_desc, route_type, route_color, route_text_color, route_url
    FROM routes
    ORDER BY
      CASE WHEN route_type IN (0,1) THEN 0 ELSE 1 END,
      route_short_name
  `).all();
}

export function getRoute(agencyKey, routeId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM routes WHERE agency_key = ? AND route_id = ?
  `).get(agencyKey, routeId);
}

export function getRouteShape(agencyKey, routeId) {
  const cacheKey = `${agencyKey}:${routeId}`;
  if (shapeCache.has(cacheKey)) return shapeCache.get(cacheKey);

  const db = getDb();
  const shapeIds = db.prepare(`
    SELECT DISTINCT shape_id FROM trips
    WHERE agency_key = ? AND route_id = ?
    LIMIT 2
  `).all(agencyKey, routeId);

  if (!shapeIds.length) return [];

  const shapes = [];
  for (const { shape_id } of shapeIds) {
    const points = db.prepare(`
      SELECT shape_pt_lat, shape_pt_lon, shape_pt_sequence
      FROM shapes
      WHERE agency_key = ? AND shape_id = ?
      ORDER BY shape_pt_sequence
    `).all(agencyKey, shape_id);

    const raw = points.map(p => [p.shape_pt_lon, p.shape_pt_lat]);
    const simplified = simplifyLine(raw, 0.00008);

    shapes.push({
      shapeId: shape_id,
      coordinates: simplified,
    });
  }

  shapeCache.set(cacheKey, shapes);
  return shapes;
}

/**
 * Get simplified shapes for all routes in a single response.
 * Aggressively simplified (large epsilon) since this is rendered zoomed out.
 * Cached on first call.
 */
export function getAllRoutesWithShapes() {
  if (allShapesCache) return allShapesCache;

  const db = getDb();
  const routes = db.prepare(`
    SELECT agency_key, route_id, route_short_name, route_long_name,
           route_type, route_color, route_text_color
    FROM routes
  `).all();

  // Precompute one representative shape per route (pick any trip)
  const result = [];
  const shapeIdStmt = db.prepare(`
    SELECT shape_id FROM trips
    WHERE agency_key = ? AND route_id = ? AND shape_id IS NOT NULL
    LIMIT 1
  `);
  const shapePointsStmt = db.prepare(`
    SELECT shape_pt_lat, shape_pt_lon
    FROM shapes
    WHERE agency_key = ? AND shape_id = ?
    ORDER BY shape_pt_sequence
  `);

  for (const r of routes) {
    const row = shapeIdStmt.get(r.agency_key, r.route_id);
    if (!row?.shape_id) continue;

    const points = shapePointsStmt.all(r.agency_key, row.shape_id);
    if (points.length < 2) continue;

    const raw = points.map(p => [p.shape_pt_lon, p.shape_pt_lat]);
    // Aggressive simplification for overview map
    const simplified = simplifyLine(raw, 0.0004);

    result.push({
      agencyKey: r.agency_key,
      routeId: r.route_id,
      shortName: r.route_short_name,
      longName: r.route_long_name,
      type: r.route_type,
      color: r.route_color,
      textColor: r.route_text_color,
      coordinates: simplified,
    });
  }

  allShapesCache = result;
  return result;
}

export function getRouteStops(agencyKey, routeId) {
  const db = getDb();
  return db.prepare(`
    SELECT DISTINCT s.stop_id, s.stop_name, s.stop_lat, s.stop_lon, s.stop_code
    FROM stops s
    JOIN stop_times st ON s.agency_key = st.agency_key AND s.stop_id = st.stop_id
    JOIN trips t ON st.agency_key = t.agency_key AND st.trip_id = t.trip_id
    WHERE t.agency_key = ? AND t.route_id = ?
    ORDER BY s.stop_name
  `).all(agencyKey, routeId);
}

export function getStop(agencyKey, stopId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM stops WHERE agency_key = ? AND stop_id = ?
  `).get(agencyKey, stopId);
}

export function getStopByIdAny(stopId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM stops WHERE stop_id = ? LIMIT 1
  `).get(stopId);
}

export function getRoutesForStop(agencyKey, stopId) {
  const db = getDb();
  return db.prepare(`
    SELECT DISTINCT r.agency_key, r.route_id, r.route_short_name,
           r.route_long_name, r.route_type, r.route_color
    FROM routes r
    JOIN trips t ON r.agency_key = t.agency_key AND r.route_id = t.route_id
    JOIN stop_times st ON t.agency_key = st.agency_key AND t.trip_id = st.trip_id
    WHERE st.agency_key = ? AND st.stop_id = ?
    ORDER BY r.route_short_name
  `).all(agencyKey, stopId);
}

export function searchRoutesAndStops(query, limit = 20) {
  const db = getDb();
  const pattern = `%${query}%`;

  const routes = db.prepare(`
    SELECT agency_key, route_id, route_short_name, route_long_name, route_type, route_color
    FROM routes
    WHERE route_short_name LIKE ? OR route_long_name LIKE ? OR route_desc LIKE ?
    LIMIT ?
  `).all(pattern, pattern, pattern, limit);

  const stops = db.prepare(`
    SELECT agency_key, stop_id, stop_code, stop_name, stop_lat, stop_lon
    FROM stops
    WHERE stop_name LIKE ? OR stop_code LIKE ? OR stop_id LIKE ?
    LIMIT ?
  `).all(pattern, pattern, pattern, limit);

  return { routes, stops };
}
