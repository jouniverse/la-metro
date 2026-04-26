import { motion } from 'framer-motion';
import useStore from '../../lib/store.js';
import { useCompactLayout } from '../../lib/layout.js';
import RouteList from './RouteList.jsx';
import NearbyPanel from './NearbyPanel.jsx';

export default function Sidebar() {
  const compact = useCompactLayout();
  const sidebarTab = useStore(s => s.sidebarTab);
  const setSidebarTab = useStore(s => s.setSidebarTab);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);

  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className={
        compact
          ? 'absolute inset-0 z-[5000] order-0 flex h-full w-full shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]'
          : 'relative z-[5000] order-0 flex h-full w-80 shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]'
      }
    >
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--color-outline)]" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--color-outline)]" />

      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-outline-variant)]">
        {[
          { key: 'routes', label: 'ROUTES' },
          { key: 'nearby', label: 'NEARBY' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSidebarTab(tab.key)}
            className={`flex-1 py-2 text-[10px] tracking-[0.15em] font-semibold uppercase transition-colors ${
              sidebarTab === tab.key
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-outline)] hover:text-[var(--color-on-surface-variant)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(false)}
          className="px-3 text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-xs"
          title="Close sidebar"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'routes' ? <RouteList /> : <NearbyPanel />}
      </div>
    </motion.div>
  );
}
