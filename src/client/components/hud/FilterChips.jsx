import useStore from '../../lib/store.js';

const FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'bus', label: 'BUS' },
  { key: 'rail', label: 'RAIL' },
];

export default function FilterChips() {
  const filterType = useStore(s => s.filters.type);
  const setFilter = useStore(s => s.setFilter);

  return (
    <div className="flex items-center gap-1.5">
      {FILTERS.map(f => {
        const active = filterType === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 text-[10px] tracking-[0.12em] font-semibold uppercase border transition-colors ${
              active
                ? 'bg-[var(--color-primary)] text-[#080808] border-[var(--color-primary)]'
                : 'bg-transparent text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]'
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
