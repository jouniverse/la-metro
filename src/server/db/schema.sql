-- LA Metro Tracker — GTFS Static Database Schema

CREATE TABLE IF NOT EXISTS agencies (
  agency_key TEXT NOT NULL,
  agency_id TEXT,
  agency_name TEXT NOT NULL,
  agency_url TEXT,
  agency_timezone TEXT,
  PRIMARY KEY (agency_key, agency_id)
);

CREATE TABLE IF NOT EXISTS routes (
  agency_key TEXT NOT NULL,
  route_id TEXT NOT NULL,
  route_short_name TEXT,
  route_long_name TEXT,
  route_desc TEXT,
  route_type INTEGER NOT NULL,
  route_color TEXT,
  route_text_color TEXT,
  route_url TEXT,
  PRIMARY KEY (agency_key, route_id)
);

CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(route_type);

CREATE TABLE IF NOT EXISTS stops (
  agency_key TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  stop_code TEXT,
  stop_name TEXT NOT NULL,
  stop_desc TEXT,
  stop_lat REAL NOT NULL,
  stop_lon REAL NOT NULL,
  stop_url TEXT,
  location_type INTEGER,
  parent_station TEXT,
  PRIMARY KEY (agency_key, stop_id)
);

CREATE INDEX IF NOT EXISTS idx_stops_name ON stops(stop_name);
CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(stop_lat, stop_lon);

CREATE TABLE IF NOT EXISTS trips (
  agency_key TEXT NOT NULL,
  route_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  trip_headsign TEXT,
  direction_id INTEGER,
  block_id TEXT,
  shape_id TEXT,
  PRIMARY KEY (agency_key, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(agency_key, route_id);
CREATE INDEX IF NOT EXISTS idx_trips_shape ON trips(shape_id);

CREATE TABLE IF NOT EXISTS stop_times (
  agency_key TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  arrival_time TEXT,
  departure_time TEXT,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  PRIMARY KEY (agency_key, trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times(agency_key, trip_id);
CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON stop_times(agency_key, stop_id);

CREATE TABLE IF NOT EXISTS shapes (
  agency_key TEXT NOT NULL,
  shape_id TEXT NOT NULL,
  shape_pt_lat REAL NOT NULL,
  shape_pt_lon REAL NOT NULL,
  shape_pt_sequence INTEGER NOT NULL,
  PRIMARY KEY (agency_key, shape_id, shape_pt_sequence)
);

CREATE INDEX IF NOT EXISTS idx_shapes_id ON shapes(agency_key, shape_id);

CREATE TABLE IF NOT EXISTS calendar (
  agency_key TEXT NOT NULL,
  service_id TEXT NOT NULL,
  monday INTEGER,
  tuesday INTEGER,
  wednesday INTEGER,
  thursday INTEGER,
  friday INTEGER,
  saturday INTEGER,
  sunday INTEGER,
  start_date TEXT,
  end_date TEXT,
  PRIMARY KEY (agency_key, service_id)
);

CREATE TABLE IF NOT EXISTS calendar_dates (
  agency_key TEXT NOT NULL,
  service_id TEXT NOT NULL,
  date TEXT NOT NULL,
  exception_type INTEGER NOT NULL,
  PRIMARY KEY (agency_key, service_id, date)
);
