import { Router } from 'express';
import { getAllRoutes, getRoute, getRouteShape, getRouteStops, getAllRoutesWithShapes } from '../services/gtfs.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const routes = getAllRoutes();

    const formatted = routes.map(r => ({
      agencyKey: r.agency_key,
      routeId: r.route_id,
      shortName: r.route_short_name || '',
      longName: r.route_long_name || '',
      desc: r.route_desc || '',
      type: r.route_type,
      typeName: r.route_type <= 1 ? 'rail' : 'bus',
      color: r.route_color || null,
      textColor: r.route_text_color || null,
      url: r.route_url || null,
    }));

    res.json({ count: formatted.length, routes: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routes', detail: err.message });
  }
});

router.get('/shapes/all', (req, res) => {
  try {
    const data = getAllRoutesWithShapes();
    // Long-lived cache — shapes rarely change
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ count: data.length, routes: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all shapes', detail: err.message });
  }
});

router.get('/:agencyKey/:routeId', (req, res) => {
  try {
    const { agencyKey, routeId } = req.params;
    const route = getRoute(agencyKey, routeId);
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const shapes = getRouteShape(agencyKey, routeId);

    res.json({
      agencyKey: route.agency_key,
      routeId: route.route_id,
      shortName: route.route_short_name,
      longName: route.route_long_name,
      desc: route.route_desc,
      type: route.route_type,
      typeName: route.route_type <= 1 ? 'rail' : 'bus',
      color: route.route_color || null,
      textColor: route.route_text_color || null,
      shapes,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch route', detail: err.message });
  }
});

router.get('/:agencyKey/:routeId/stops', (req, res) => {
  try {
    const { agencyKey, routeId } = req.params;
    const stops = getRouteStops(agencyKey, routeId);
    res.json({ count: stops.length, stops });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stops', detail: err.message });
  }
});

export default router;
