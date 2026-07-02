import {
  IconCheckCircle,
  IconAlertTriangle,
  IconInfo,
  IconXCircle,
  IconX,
} from './Icons';

interface AlertBannerProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  onClose?: () => void;
}

const alertConfig = {
  error: {
    Icon: IconXCircle,
    background: '#fef2f2',
    border: '#fecaca',
    color: '#b91c1c',
  },
  warning: {
    Icon: IconAlertTriangle,
    background: '#fffbeb',
    border: '#fde68a',
    color: '#b45309',
  },
  info: {
    Icon: IconInfo,
    background: '#eff6ff',
    border: '#bfdbfe',
    color: '#1e40af',
  },
  success: {
    Icon: IconCheckCircle,
    background: '#f0fdf4',
    border: '#bbf7d0',
    color: '#15803d',
  },
};

export default function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  const cfg = alertConfig[type];
  const IconComp = cfg.Icon;

  // Strip any remaining emojis from the message for consistency
  const cleanMessage = message.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚠️✅🚫💧]/gu, '').trim();

  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium leading-relaxed animate-slide-up"
      style={{
        background: cfg.background,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      <IconComp size={16} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: '2px' }} />
      <span className="flex-1">{cleanMessage}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Fermer l'alerte"
        >
          <IconX size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
