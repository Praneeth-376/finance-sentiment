import React from 'react';

export default function SentimentGauge({ value = 0 }) {
  // clamp -1..1
  const v = Math.max(-1, Math.min(1, value));
  const angle = (v + 1) * 90; // map -1..1 to 0..180
  const pct = ((v + 1) / 2) * 100;

  const color =
    v > 0.2 ? 'from-emerald-400 to-emerald-600' :
    v < -0.2 ? 'from-rose-400 to-rose-600' :
    'from-slate-400 to-slate-500';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full">
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 200 100" className="w-full h-24">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>

            {/* Track */}
            <path d="M10 90 A80 80 0 0 1 190 90" fill="none" stroke="#e6eef9" strokeWidth="18" strokeLinecap="round" />

            {/* Needle group */}
            <g transform={`translate(100,90) rotate(${angle})`}>
              <rect x="-2" y="-70" width="4" height="70" rx="2" fill="#111827" opacity="0.9" />
              <circle cx="0" cy="0" r="6" fill="#111827" />
            </g>
          </svg>

          {/* Center values */}
          <div className="absolute text-center">
            <div className="text-sm text-slate-500">Score</div>
            <div className="text-2xl font-semibold" data-testid="sentiment-score">{v.toFixed(2)}</div>
            <div className="text-xs text-slate-400">{pct.toFixed(0)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
