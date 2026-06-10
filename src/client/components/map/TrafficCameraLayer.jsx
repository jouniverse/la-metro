import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../lib/store.js';

const CCTV_URL = 'https://cwwp2.dot.ca.gov/data/d7/cctv/cctvStatusD07.json';
// Refresh camera list every 24 hours; the image URLs themselves are static
// and the server updates the image content on its own schedule (~2 min).
const REFRESH_MS = 24 * 60 * 60 * 1000;

// Module-level cache so toggling on/off re-uses the last fetch.
let cachedCameras = null;
let cacheTime = 0;

function makeCameraIcon(selected = false) {
  const color = '#b0ff6a';
  const glowRadius = selected ? 8 : 4;
  const glowAlpha = selected ? 1 : 0.7;
  const size = selected ? 22 : 16;
  // Scale the SVG paths from the 16×16 viewBox into the chosen size.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    ${selected ? `<rect x="0" y="3" width="12" height="10" rx="1.5" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.35"/>` : ''}
    <rect x="1" y="4" width="10" height="8" rx="1" fill="${selected ? 'rgba(176,255,106,0.15)' : 'none'}" stroke="${color}" stroke-width="${selected ? 1.5 : 1.2}" opacity="0.9"/>
    <polygon points="11,6 15,4 15,12 11,10" fill="${color}" opacity="${selected ? 1 : 0.75}"/>
    <circle cx="6" cy="8" r="2" fill="none" stroke="${color}" stroke-width="${selected ? 1.2 : 0.9}" opacity="${selected ? 1 : 0.8}"/>
  </svg>`;
  return L.divIcon({
    html: `<div class="${selected ? 'selected-vehicle-pulse' : ''}" style="filter: drop-shadow(0 0 ${glowRadius}px rgba(176,255,106,${glowAlpha}))">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: 'camera-marker',
  });
}

const normalIcon = makeCameraIcon(false);
const selectedIcon = makeCameraIcon(true);

function popupHtml(cam) {
  const loc = cam.location ?? {};
  const img = cam.imageData?.static?.currentImageURL ?? '';
  const name = loc.locationName ?? 'Unknown location';
  const place = loc.nearbyPlace ?? '';
  const lat = parseFloat(loc.latitude ?? 0).toFixed(5);
  const lon = parseFloat(loc.longitude ?? 0).toFixed(5);

  return `
    <div style="
      background: var(--color-surface-container, #0d1117);
      border: 1px solid var(--color-outline-variant, #2a3040);
      color: var(--color-on-surface, #d0d8e8);
      font-family: var(--font-mono, monospace);
      font-size: 11px;
      width: 360px;
      padding: 0;
      border-radius: 2px;
      overflow: hidden;
    ">
      ${img ? `
        <div style="position:relative;width:100%;height:auto;background:#000;overflow:hidden;">
          <img
            src="${img}"
            alt="${name}"
            style="width:100%;height:100%;object-fit:contain;display:block;opacity:0.92;"
            onerror="this.style.display='none'"
          />
          <div style="position:absolute;top:4px;left:6px;font-size:9px;color:rgba(176,255,106,0.7);letter-spacing:0.1em;">◉ LIVE</div>
        </div>
      ` : `
        <div style="width:100%;height:60px;background:#111;display:flex;align-items:center;justify-content:center;color:#444;font-size:10px;letter-spacing:.12em;">NO IMAGE</div>
      `}
      <div style="padding:8px 10px;display:flex;flex-direction:column;gap:4px;">
        <div style="color:#b0ff6a;font-weight:bold;letter-spacing:0.1em;font-size:10px;line-height:1.3;">${name}</div>
        ${place ? `<div style="color:#8899aa;letter-spacing:0.08em;">${place}</div>` : ''}
        <div style="color:#6a7a8a;margin-top:2px;letter-spacing:0.07em;">
          LAT ${lat} &nbsp; LON ${lon}
        </div>
      </div>
    </div>
  `;
}

async function fetchCameras() {
  const now = Date.now();
  if (cachedCameras && now - cacheTime < REFRESH_MS) return cachedCameras;

  const res = await fetch(CCTV_URL);
  if (!res.ok) throw new Error(`CCTV fetch failed: ${res.status}`);
  const json = await res.json();

  cachedCameras = (json.data ?? [])
    .map(entry => entry.cctv)
    .filter(cam => {
      const inService = cam?.inService === 'true';
      const lat = parseFloat(cam?.location?.latitude);
      const lon = parseFloat(cam?.location?.longitude);
      return inService && !isNaN(lat) && !isNaN(lon);
    });
  cacheTime = now;
  return cachedCameras;
}

export default function TrafficCameraLayer() {
  const map = useMap();
  const showTrafficCameras = useStore(s => s.showTrafficCameras);
  const layerRef = useRef(null);
  const selectedMarkerRef = useRef(null); // the marker whose popup is currently open
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!showTrafficCameras) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      selectedMarkerRef.current = null;
      return;
    }

    let cancelled = false;

    fetchCameras()
      .then(cameras => {
        if (cancelled) return;
        const group = L.layerGroup();
        for (const cam of cameras) {
          const lat = parseFloat(cam.location.latitude);
          const lon = parseFloat(cam.location.longitude);
          const marker = L.marker([lat, lon], { icon: normalIcon, interactive: true });
          marker.bindPopup(popupHtml(cam), {
            maxWidth: 370,
            className: 'camera-popup',
          });

          marker.on('popupopen', () => {
            // Deselect the previously selected marker (if any).
            if (selectedMarkerRef.current && selectedMarkerRef.current !== marker) {
              selectedMarkerRef.current.setIcon(normalIcon);
              selectedMarkerRef.current.setZIndexOffset(0);
            }
            // Emphasise this marker.
            marker.setIcon(selectedIcon);
            marker.setZIndexOffset(500);
            selectedMarkerRef.current = marker;

            // Refresh the image so the user sees a fresh frame.
            const img = marker.getPopup()?.getElement()?.querySelector('img');
            if (img) {
              const base = img.src.split('?')[0];
              img.src = `${base}?t=${Date.now()}`;
            }
          });

          marker.on('popupclose', () => {
            marker.setIcon(normalIcon);
            marker.setZIndexOffset(0);
            if (selectedMarkerRef.current === marker) {
              selectedMarkerRef.current = null;
            }
          });

          marker.addTo(group);
        }
        group.addTo(map);
        layerRef.current = group;
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[TrafficCameraLayer]', err.message);
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
      selectedMarkerRef.current = null;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [showTrafficCameras, map]);

  // Error toast (auto-clear)
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  return null;
}
