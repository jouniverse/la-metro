import { useState, useEffect } from 'react';
import useStore from '../../lib/store.js';
import { useCompactLayout } from '../../lib/layout.js';
import SearchBar from './SearchBar.jsx';
import FilterChips from './FilterChips.jsx';

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'America/Los_Angeles',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-sm tracking-wider text-[var(--color-primary)]">{time}</span>;
}

function MenuButton({ sidebarOpen, setSidebarOpen, compact }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="relative z-[6000] flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] transition-opacity active:opacity-90"
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <span className="flex flex-col gap-[3px]" aria-hidden="true">
          <span className="block h-px w-5 bg-[var(--color-primary)]" />
          <span className="block h-px w-5 bg-[var(--color-primary)]" />
          <span className="block h-px w-5 bg-[var(--color-primary)]" />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="relative z-[6000] flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
      aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <div className="h-2 w-2 rotate-45 bg-[var(--color-primary)]" />
      <span className="text-sm font-bold tracking-[0.12em] text-[var(--color-primary)] uppercase">LA Metro</span>
    </button>
  );
}

export default function Header() {
  const compact = useCompactLayout();
  const vehicleCount = useStore(s => s.vehicleCount);
  const connectionStatus = useStore(s => s.connectionStatus);
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const selectedRoute = useStore(s => s.selectedRoute);
  const selectedStop = useStore(s => s.selectedStop);
  const selectedVehicle = useStore(s => s.selectedVehicle);
  const clearSelection = useStore(s => s.clearSelection);
  const showAllRoutes = useStore(s => s.showAllRoutes);
  const setShowAllRoutes = useStore(s => s.setShowAllRoutes);
  const showTrafficCameras = useStore(s => s.showTrafficCameras);
  const setShowTrafficCameras = useStore(s => s.setShowTrafficCameras);
  const animationMode = useStore(s => s.animationMode);
  const setAnimationMode = useStore(s => s.setAnimationMode);
  const stopDetailOpen = useStore(s => s.stopDetailOpen);
  const toggleStopDetail = useStore(s => s.toggleStopDetail);

  const hasSelection = !!(selectedRoute || selectedStop || selectedVehicle);

  const animLabels = { all: 'ANIM: FULL', focused: 'ANIM: FOCUS', off: 'ANIM: OFF' };
  const cycleAnim = () => {
    const order = ['all', 'focused', 'off'];
    setAnimationMode(order[(order.indexOf(animationMode) + 1) % order.length]);
  };

  const animBtn = (
    <button
      type="button"
      onClick={cycleAnim}
      className={`inline-flex shrink-0 items-center border px-2 py-1 text-[10px] tracking-[0.15em] uppercase transition-colors ${
        animationMode === 'all'
          ? 'border-[var(--color-secondary)] text-[var(--color-secondary)]'
          : animationMode === 'focused'
          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
          : 'border-[var(--color-outline-variant)] text-[var(--color-outline)]'
      }`}
      title="Cycle vehicle animation: full → focus → off"
    >
      <span className="hidden sm:inline">{animLabels[animationMode]}</span>
      <span className="sm:hidden" aria-hidden="true">
        {animationMode === 'all' ? 'A·FULL' : animationMode === 'focused' ? 'A·FOC' : 'A·OFF'}
      </span>
    </button>
  );

  const deselectBtn = hasSelection && (
    <button
      type="button"
      onClick={clearSelection}
      className="inline-flex shrink-0 items-center gap-1 border border-[var(--color-error)] px-2 py-1 text-[10px] tracking-[0.15em] text-[var(--color-error)] uppercase transition-colors hover:bg-[var(--color-error)] hover:text-black"
      title="Deselect (Esc)"
    >
      <span>✕</span>
      <span className="hidden sm:inline">DESELECT</span>
    </button>
  );

  const stopPanelBtn = selectedStop && (
    <button
      type="button"
      onClick={toggleStopDetail}
      className="inline-flex shrink-0 items-center border border-[var(--color-tertiary)] px-2 py-1 text-[10px] tracking-[0.15em] text-[var(--color-tertiary)] uppercase transition-colors hover:bg-[var(--color-surface-container)]"
      title={stopDetailOpen ? 'Hide stop / predictions panel' : 'Show stop / predictions panel'}
    >
      <span className="hidden sm:inline">{stopDetailOpen ? '◆ HIDE PANEL' : '◆ STOP PANEL'}</span>
      <span className="sm:hidden">{stopDetailOpen ? '◆ HIDE' : '◆ PANEL'}</span>
    </button>
  );

  const statusDot = (
    <div
      className={`h-2 w-2 shrink-0 rounded-full ${
        connectionStatus === 'connected'
          ? 'bg-[var(--color-secondary)]'
          : connectionStatus === 'connecting'
          ? 'pulse-glow bg-[var(--color-primary)]'
          : 'bg-[var(--color-error)]'
      }`}
      title={`Status: ${connectionStatus}`}
    />
  );

  if (compact) {
    return (
      <header
        className="relative z-[6000] mt-2 flex min-h-0 w-full shrink-0 flex-col gap-1.5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)] px-3 pb-1"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex w-full min-w-0 items-center gap-2">
          <MenuButton compact sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          <div className="min-w-0 flex-1">
            <SearchBar compact />
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-[var(--color-outline-variant)] pt-1.5 pb-0.5">
          <FilterChips />
          {animBtn}
          {stopPanelBtn}
          {deselectBtn}
          <div className="min-w-2 flex-1" />
          {statusDot}
        </div>
      </header>
    );
  }

  return (
    <header
      className="relative z-[6000] flex min-h-12 shrink-0 items-center gap-2 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)] px-3 sm:gap-4 sm:px-5 md:px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <MenuButton compact={false} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="hidden h-4 w-px bg-[var(--color-outline-variant)] sm:block" />

      <div className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase sm:gap-3">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          <span className="hidden text-[var(--color-on-surface-variant)] sm:inline">BUS</span>
          <span className="font-bold text-[var(--color-primary)]">{vehicleCount.bus}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-tertiary)]" />
          <span className="hidden text-[var(--color-on-surface-variant)] sm:inline">RAIL</span>
          <span className="font-bold text-[var(--color-tertiary)]">{vehicleCount.rail}</span>
        </div>
      </div>

      <div className="hidden h-4 w-px bg-[var(--color-outline-variant)] sm:block" />

      <div className="hidden sm:flex">
        <FilterChips />
      </div>

      <button
        type="button"
        onClick={() => setShowAllRoutes(!showAllRoutes)}
        className={`hidden items-center border px-2 py-1 text-[10px] tracking-[0.15em] uppercase transition-colors md:inline-flex ${
          showAllRoutes
            ? 'border-[var(--color-primary)] bg-[var(--color-surface-container)] text-[var(--color-primary)]'
            : 'border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'
        }`}
        title="Toggle full route network overlay"
      >
        {showAllRoutes ? '◼ ALL ROUTES' : '◻ ALL ROUTES'}
      </button>

      <button
        type="button"
        onClick={() => setShowTrafficCameras(!showTrafficCameras)}
        className={`hidden items-center border px-2 py-1 text-[10px] tracking-[0.15em] uppercase transition-colors md:inline-flex ${
          showTrafficCameras
            ? 'border-[var(--color-secondary)] bg-[var(--color-surface-container)] text-[var(--color-secondary)]'
            : 'border-[var(--color-outline-variant)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)]'
        }`}
        title="Toggle Caltrans traffic camera locations"
      >
        {showTrafficCameras ? '◉ CAMERAS' : '○ CAMERAS'}
      </button>

      {animBtn}
      {stopPanelBtn}
      {deselectBtn}

      <div className="min-w-0 flex-1" />

      <SearchBar compact={false} />

      <div className="hidden h-4 w-px bg-[var(--color-outline-variant)] sm:block" />

      <div className="hidden sm:block">
        <LiveClock />
      </div>
      {statusDot}
    </header>
  );
}
