'use client';

export default function LoadingSpinner() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
      {/* Spinner Ring */}
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-accent-gold/20 blur-xl" />

        {/* Spinning ring */}
        <div className="relative h-16 w-16">
          <div
            className="animate-spin-slow absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: '#d4af37',
              borderRightColor: 'rgba(212, 175, 55, 0.25)',
            }}
          />
          <div
            className="animate-spin-slow absolute inset-1 rounded-full border-2 border-transparent"
            style={{
              borderBottomColor: '#a61b1b',
              borderLeftColor: 'rgba(166, 27, 27, 0.25)',
              animationDirection: 'reverse',
              animationDuration: '1.5s',
            }}
          />
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-accent-gold-glowing animate-pulse-glow" />
          </div>
        </div>
      </div>

      {/* Loading text */}
      <p className="animate-pulse-glow text-sm font-medium tracking-wider text-accent-gold">
        กำลังโหลด...
      </p>
    </div>
  );
}
