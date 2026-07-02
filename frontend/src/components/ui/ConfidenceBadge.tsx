import { IconCheckCircle, IconAlertTriangle, IconAlertCircle } from './Icons';

interface ConfidenceBadgeProps {
  confidence: number; // 0 to 1
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  const getConfig = () => {
    if (pct >= 80) return {
      label: 'Fiabilité élevée',
      Icon: IconCheckCircle,
      color: '#15803d',
      trackBg: '#dcfce7',
      fillColor: '#22c55e',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    };
    if (pct >= 55) return {
      label: 'Fiabilité modérée',
      Icon: IconAlertTriangle,
      color: '#b45309',
      trackBg: '#fef3c7',
      fillColor: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
    };
    return {
      label: 'Faible fiabilité',
      Icon: IconAlertCircle,
      color: '#b91c1c',
      trackBg: '#fee2e2',
      fillColor: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
    };
  };

  const cfg = getConfig();
  const IconComp = cfg.Icon;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score de confiance : ${pct}%`}
    >
      <IconComp size={16} strokeWidth={2.25} style={{ color: cfg.color, flexShrink: 0 }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-sm font-black" style={{ color: cfg.color }}>
            {pct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: cfg.trackBg }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: cfg.fillColor }}
          />
        </div>
      </div>
    </div>
  );
}
