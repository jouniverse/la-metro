/**
 * LA Metro Tracker — Express API server
 */

import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

import vehiclesRouter from './routes/vehicles.js';
import routesRouter from './routes/routes.js';
import stopsRouter from './routes/stops.js';
import predictionsRouter from './routes/predictions.js';
import searchRouter from './routes/search.js';
import { startPoller, getPollerStatus } from './services/poller.js';
import { initDb, getDbStats } from './db/database.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
// Compression must be skipped for SSE streams — otherwise events get buffered
// until a gzip chunk fills, causing long delays before the client sees data.
app.use(compression({
  filter: (req, res) => {
    if (req.path.endsWith('/stream')) return false;
    return compression.filter(req, res);
  },
}));
app.use(cors({
  origin: isProduction ? false : ['http://localhost:5173'],
}));
app.use(express.json());

// API routes
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/routes', routesRouter);
app.use('/api/stops', stopsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/search', searchRouter);

app.get('/api/status', (req, res) => {
  const dbStats = getDbStats();
  const poller = getPollerStatus();
  res.json({
    status: 'ok',
    db: dbStats,
    poller,
    uptime: process.uptime(),
  });
});

// Serve frontend in production
const distDir = join(__dirname, '..', 'dist');
if (isProduction && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
}

// Initialize DB and start
try {
  initDb();
  console.log('[server] Database initialized');
  const stats = getDbStats();
  console.log(`[server] DB stats: ${stats.routes} routes, ${stats.stops} stops, ${stats.trips} trips`);
} catch (err) {
  console.warn('[server] Database not seeded yet. Run `npm run seed` first.', err.message);
}

app.listen(PORT, () => {
  console.log(`[server] LA Metro Tracker API on http://localhost:${PORT}`);
  startPoller();
});
