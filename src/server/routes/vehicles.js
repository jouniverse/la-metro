import { Router } from 'express';
import { getVehicles, getVehicle, addSseClient, getPollerStatus } from '../services/poller.js';

const router = Router();

router.get('/', (req, res) => {
  const { agency, routeId } = req.query;
  let vehicles = getVehicles();

  if (agency) vehicles = vehicles.filter(v => v.agency === agency);
  if (routeId) vehicles = vehicles.filter(v => v.routeId === routeId);

  res.json({
    count: vehicles.length,
    timestamp: new Date().toISOString(),
    vehicles,
  });
});

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  if (res.socket) res.socket.setNoDelay(true);
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE connected' })}\n\n`);

  const vehicles = getVehicles();
  res.write(`event: vehicles\ndata: ${JSON.stringify({
    vehicles,
    timestamp: new Date().toISOString(),
    count: vehicles.length,
  })}\n\n`);

  // Heartbeat every 20s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { clearInterval(heartbeat); }
  }, 20_000);
  res.on('close', () => clearInterval(heartbeat));

  addSseClient(res);
});

router.get('/:vehicleId', (req, res) => {
  const v = getVehicle(req.params.vehicleId);
  if (!v) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(v);
});

export default router;
