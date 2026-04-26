/**
 * SQLite database connection and helpers for GTFS static data.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'gtfs.db');

let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
  }
  return db;
}

export function initDb() {
  const database = getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  database.exec(schema);
  return database;
}

export function getDbStats() {
  const database = getDb();
  try {
    const routes = database.prepare('SELECT COUNT(*) as count FROM routes').get();
    const stops = database.prepare('SELECT COUNT(*) as count FROM stops').get();
    const trips = database.prepare('SELECT COUNT(*) as count FROM trips').get();
    const shapes = database.prepare('SELECT COUNT(DISTINCT shape_id) as count FROM shapes').get();
    return {
      routes: routes.count,
      stops: stops.count,
      trips: trips.count,
      shapes: shapes.count,
    };
  } catch {
    return { routes: 0, stops: 0, trips: 0, shapes: 0 };
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
