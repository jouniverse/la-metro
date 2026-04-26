/**
 * GTFS Seed Script — Imports GTFS .txt (CSV) files into SQLite.
 *
 * Usage: node server/scripts/seed-gtfs.js
 *
 * Reads from ../notes/latest/lametro/ for both bus and rail feeds.
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'gtfs.db');
const SCHEMA_PATH = join(__dirname, '..', 'db', 'schema.sql');

const FEEDS = [
  { agencyKey: 'lametro', dir: join(PROJECT_ROOT, 'notes', 'latest', 'lametro', 'lametro_latest') },
  { agencyKey: 'lametro-rail', dir: join(PROJECT_ROOT, 'notes', 'latest', 'lametro', 'lametro_rail_latest') },
];

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function readCsv(filePath) {
  const rows = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let headers = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    if (!headers) {
      headers = fields;
      continue;
    }
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = fields[i] || '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

async function seedTable(db, agencyKey, feedDir, fileName, tableName, columns) {
  const filePath = join(feedDir, fileName);
  if (!existsSync(filePath)) {
    console.log(`  [skip] ${fileName} not found`);
    return 0;
  }

  console.log(`  [seed] ${fileName} -> ${tableName}...`);
  const { rows } = await readCsv(filePath);

  const placeholders = columns.map(() => '?').join(', ');
  const colNames = ['agency_key', ...columns].join(', ');
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (?, ${placeholders})`
  );

  const batchInsert = db.transaction((batch) => {
    for (const row of batch) {
      const values = columns.map(col => row[col] ?? '');
      stmt.run(agencyKey, ...values);
    }
  });

  const BATCH_SIZE = 10_000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batchInsert(rows.slice(i, i + BATCH_SIZE));
    if (rows.length > BATCH_SIZE) {
      process.stdout.write(`    ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}\r`);
    }
  }

  console.log(`    ${rows.length} rows inserted`);
  return rows.length;
}

async function main() {
  console.log('=== GTFS Seed Script ===\n');

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Remove old DB and recreate
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');
  db.pragma('cache_size = -128000');

  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  // Drop existing tables
  const tables = ['calendar_dates', 'calendar', 'shapes', 'stop_times', 'trips', 'stops', 'routes', 'agencies'];
  for (const t of tables) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
  }
  db.exec(schema);
  console.log('Database schema created\n');

  for (const feed of FEEDS) {
    console.log(`\nProcessing feed: ${feed.agencyKey}`);
    console.log(`  Directory: ${feed.dir}`);

    if (!existsSync(feed.dir)) {
      console.error(`  [ERROR] Feed directory not found: ${feed.dir}`);
      continue;
    }

    await seedTable(db, feed.agencyKey, feed.dir, 'routes.txt', 'routes', [
      'route_id', 'route_short_name', 'route_long_name', 'route_desc',
      'route_type', 'route_color', 'route_text_color', 'route_url',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'stops.txt', 'stops', [
      'stop_id', 'stop_code', 'stop_name', 'stop_desc',
      'stop_lat', 'stop_lon', 'stop_url', 'location_type', 'parent_station',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'trips.txt', 'trips', [
      'route_id', 'service_id', 'trip_id', 'trip_headsign',
      'direction_id', 'block_id', 'shape_id',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'shapes.txt', 'shapes', [
      'shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'stop_times.txt', 'stop_times', [
      'trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'calendar.txt', 'calendar', [
      'service_id', 'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday', 'start_date', 'end_date',
    ]);

    await seedTable(db, feed.agencyKey, feed.dir, 'calendar_dates.txt', 'calendar_dates', [
      'service_id', 'date', 'exception_type',
    ]);
  }

  // Print stats
  const stats = [
    ['routes', db.prepare('SELECT COUNT(*) as c FROM routes').get().c],
    ['stops', db.prepare('SELECT COUNT(*) as c FROM stops').get().c],
    ['trips', db.prepare('SELECT COUNT(*) as c FROM trips').get().c],
    ['shapes', db.prepare('SELECT COUNT(*) as c FROM shapes').get().c],
    ['stop_times', db.prepare('SELECT COUNT(*) as c FROM stop_times').get().c],
    ['calendar', db.prepare('SELECT COUNT(*) as c FROM calendar').get().c],
  ];

  console.log('\n=== Seed Complete ===');
  for (const [name, count] of stats) {
    console.log(`  ${name}: ${count.toLocaleString()} rows`);
  }

  db.close();
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
