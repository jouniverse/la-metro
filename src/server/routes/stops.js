import { Router } from 'express';
import { getStop, getStopByIdAny, getRoutesForStop } from '../services/gtfs.js';

const router = Router();

router.get('/:agencyKey/:stopId', (req, res) => {
  try {
    const { agencyKey, stopId } = req.params;
    const stop = getStop(agencyKey, stopId);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });

    const routes = getRoutesForStop(agencyKey, stopId);

    res.json({
      agencyKey: stop.agency_key,
      stopId: stop.stop_id,
      stopCode: stop.stop_code,
      stopName: stop.stop_name,
      lat: stop.stop_lat,
      lon: stop.stop_lon,
      routes: routes.map(r => ({
        agencyKey: r.agency_key,
        routeId: r.route_id,
        shortName: r.route_short_name,
        longName: r.route_long_name,
        type: r.route_type,
        color: r.route_color,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stop', detail: err.message });
  }
});

router.get('/find/:stopId', (req, res) => {
  try {
    const stop = getStopByIdAny(req.params.stopId);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });
    res.json({
      agencyKey: stop.agency_key,
      stopId: stop.stop_id,
      stopCode: stop.stop_code,
      stopName: stop.stop_name,
      lat: stop.stop_lat,
      lon: stop.stop_lon,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
