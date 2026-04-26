import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import useStore from './lib/store.js';
import { createVehicleStream, getRoutes } from './lib/api.js';
import Header from './components/hud/Header.jsx';
import StatusBar from './components/hud/StatusBar.jsx';
import MapView from './components/map/MapView.jsx';
import Sidebar from './components/sidebar/Sidebar.jsx';
import StopDetail from './components/detail/StopDetail.jsx';
import VehicleDetail from './components/detail/VehicleDetail.jsx';
import DetailReopener from './components/hud/DetailReopener.jsx';
import BootScreen from './components/boot/BootScreen.jsx';

export default function App() {
  const booted = useStore(s => s.booted);
  const setVehicles = useStore(s => s.setVehicles);
  const applyVehicleDelta = useStore(s => s.applyVehicleDelta);
  const setRoutes = useStore(s => s.setRoutes);
  const setConnectionStatus = useStore(s => s.setConnectionStatus);
  const setBooted = useStore(s => s.setBooted);
  const loadFavorites = useStore(s => s.loadFavorites);
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const stopDetailOpen = useStore(s => s.stopDetailOpen);
  const selectedVehicle = useStore(s => s.selectedVehicle);
  const sseRef = useRef(null);
  const firstDataRef = useRef(false);

  useEffect(() => {
    loadFavorites();

    getRoutes()
      .then(data => setRoutes(data.routes || []))
      .catch(err => console.error('Failed to load routes:', err));

    sseRef.current = createVehicleStream(
      (data) => {
        setVehicles(data.vehicles || []);
        setConnectionStatus('connected');
        if (!firstDataRef.current) {
          firstDataRef.current = true;
          setTimeout(() => setBooted(), 800);
        }
      },
      (delta) => {
        // Incremental delta — apply surgically to avoid replacing the full Map.
        applyVehicleDelta(delta);
        setConnectionStatus('connected');
        if (!firstDataRef.current) {
          firstDataRef.current = true;
          setTimeout(() => setBooted(), 800);
        }
      },
      () => setConnectionStatus('error')
    );

    const fallbackTimer = setTimeout(() => {
      if (!firstDataRef.current) {
        firstDataRef.current = true;
        setBooted();
      }
    }, 5000);

    return () => {
      sseRef.current?.close();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Global keyboard shortcuts
  const handleKeyboard = useCallback((e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 's' || e.key === 'S') setSidebarOpen(!useStore.getState().sidebarOpen);
    if (e.key === 'Escape') useStore.getState().clearSelection();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  return (
    <>
      {!booted && <BootScreen />}
      <div className={`h-dvh min-h-0 w-screen flex flex-col ${booted ? '' : 'invisible'}`}>
        <Header />
        {/*
          Map is first in the DOM and z-0 so the Leaflet stack cannot paint
          over sidebars. Flex `order` keeps the visual L→R: sidebar, map, stop
          on desktop. Touch overlays still stack above the map.
        */}
        <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
          <div className="relative z-0 order-1 min-h-0 min-w-0 flex-1 isolate">
            <MapView />
            {selectedVehicle && <VehicleDetail />}
            <DetailReopener />
          </div>
          <AnimatePresence>
            {sidebarOpen && <Sidebar key="sidebar" />}
          </AnimatePresence>
          <AnimatePresence>
            {stopDetailOpen && <StopDetail key="stop-detail" />}
          </AnimatePresence>
        </div>
        <StatusBar />
      </div>
      <div className="scanline-overlay" />
    </>
  );
}
