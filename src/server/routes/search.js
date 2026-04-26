import { Router } from 'express';
import { searchRoutesAndStops } from '../services/gtfs.js';
import { searchVehicles } from '../services/poller.js';

const router = Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json({ routes: [], stops: [], vehicles: [] });
  }

  try {
    const results = searchRoutesAndStops(q, 10);
    const vehicles = searchVehicles(q, 8).map(v => ({
      id: v.id,
      label: v.label,
      routeId: v.routeId,
      agency: v.agency,
      lat: v.lat,
      lon: v.lon,
      bearing: v.bearing,
      speed: v.speed,
    }));

    res.json({
      query: q,
      routes: results.routes.map(r => ({
        agencyKey: r.agency_key,
        routeId: r.route_id,
        shortName: r.route_short_name,
        longName: r.route_long_name,
        type: r.route_type,
        typeName: r.route_type <= 1 ? 'rail' : 'bus',
        color: r.route_color,
      })),
      stops: results.stops.map(s => ({
        agencyKey: s.agency_key,
        stopId: s.stop_id,
        stopCode: s.stop_code,
        stopName: s.stop_name,
        lat: s.stop_lat,
        lon: s.stop_lon,
      })),
      vehicles,
    });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

export default router;
