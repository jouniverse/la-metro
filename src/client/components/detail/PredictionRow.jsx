import { useState, useEffect } from 'react';
import { formatTime, formatPredictionVehicleId } from '../../lib/utils.js';

export default function PredictionRow({ prediction, isFirst }) {
  const [countdown, setCountdown] = useState(prediction.sec || 0);

  useEffect(() => {
    setCountdown(prediction.sec || 0);
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [prediction.sec]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const isArriving = countdown < 60;

  const rawId = prediction.vehicleId;
  const idLabel = formatPredictionVehicleId(rawId);
  const idTitle = rawId != null && String(rawId) !== '' ? String(rawId) : undefined;

  return (
    <div
      className={`flex items-stretch justify-between gap-3 py-1 ${isFirst ? '' : 'opacity-70'}`}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-mono leading-snug text-[var(--color-outline)] [overflow-wrap:anywhere] break-words"
          title={idTitle}
        >
          #{idLabel}
        </div>
        <div className="mt-0.5 text-[10px] tabular-nums text-[var(--color-on-surface-variant)]">
          {formatTime(prediction.time)}
        </div>
      </div>

      <div
        className={`shrink-0 self-center text-right font-mono font-bold ${
        isArriving
          ? 'text-flicker text-[var(--color-secondary)]'
          : isFirst
          ? 'text-[var(--color-primary)]'
          : 'text-[var(--color-on-surface-variant)]'
      }`}
      >
        {countdown <= 0 ? (
          <span className="text-sm">NOW</span>
        ) : isArriving ? (
          <span className="text-sm">{seconds}s</span>
        ) : (
          <span className="text-sm">
            {minutes}
            <span className="text-[10px] opacity-60">m</span>
          </span>
        )}
      </div>
    </div>
  );
}
