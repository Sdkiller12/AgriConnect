interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ message, size = 'md' }: LoadingSpinnerProps) {
  const sizes = {
    sm: { outer: 28, inner: 20 },
    md: { outer: 44, inner: 32 },
    lg: { outer: 60, inner: 44 },
  };
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      {/* Spinner rings */}
      <div className="relative flex items-center justify-center" style={{ width: s.outer, height: s.outer }}>
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-slate-200 animate-spin-slow"
          style={{
            borderTopColor: '#16a34a',
            animation: 'spin-slow 1.2s linear infinite',
          }}
        />
        {/* Inner ring */}
        <div
          className="rounded-full border-2 border-slate-100"
          style={{
            width: s.inner,
            height: s.inner,
            borderTopColor: '#4ade80',
            animation: 'spin-slow 0.8s linear infinite reverse',
          }}
        />
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{ width: 6, height: 6, background: '#16a34a' }}
        />
      </div>

      {/* Message */}
      {message && (
        <p className="text-sm font-semibold text-slate-400 text-center max-w-xs leading-relaxed animate-pulse-soft">
          {message}
        </p>
      )}

      <span className="sr-only">{message || 'Chargement en cours...'}</span>
    </div>
  );
}
