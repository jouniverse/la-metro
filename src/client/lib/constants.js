export const POLL_INTERVAL = 10_000;

export const LA_CENTER = [34.052, -118.243];
export const DEFAULT_ZOOM = 11;

export const TILE_LAYERS = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 18,
  },
};

export const RAIL_COLORS = {
  '801': '#0072BC', // A Line (Blue)
  '802': '#EB131B', // B Line (Red)
  '803': '#58A738', // C Line (Green)
  '804': '#FDB913', // E Line (Gold)
  '805': '#A05DA5', // D Line (Purple)
  '807': '#E56DB1', // K Line (Pink)
};

export const ROUTE_TYPE = {
  TRAM: 0,
  SUBWAY: 1,
  RAIL: 2,
  BUS: 3,
};

export const AGENCY_LABELS = {
  'lametro': 'LA Metro Bus',
  'lametro-rail': 'LA Metro Rail',
};
