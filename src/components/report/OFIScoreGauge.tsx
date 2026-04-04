"use client";

interface OFIScoreGaugeProps {
  score: number;
  tier: "LOW" | "MEDIUM" | "HIGH";
  tierLabel: string;
  confidence: string;
}

export function OFIScoreGauge({
  score,
  tier,
  tierLabel,
  confidence,
}: OFIScoreGaugeProps) {
  const tierColors = {
    LOW: { stroke: "#854f0b", bg: "#faeeda", text: "text-amber" },
    MEDIUM: { stroke: "#0f6e56", bg: "#e1f5ee", text: "text-teal" },
    HIGH: { stroke: "#0f6e56", bg: "#e1f5ee", text: "text-teal" },
  };

  const colors = tierColors[tier];
  // SVG arc for the gauge
  const radius = 70;
  const circumference = Math.PI * radius; // semicircle
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Gauge */}
      <div className="relative w-[180px] h-[100px]">
        <svg
          viewBox="0 0 180 100"
          className="w-full h-full"
          aria-label={`OFI Score: ${score} out of 100`}
        >
          {/* Background arc */}
          <path
            d="M 10 90 A 70 70 0 0 1 170 90"
            fill="none"
            stroke="#e5e5e0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 90 A 70 70 0 0 1 170 90"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="font-serif text-4xl text-ink leading-none">
            {score}
          </span>
          <span className="text-[11px] text-ink-soft mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.stroke }}
        >
          {tierLabel}
        </span>
        <span className="text-xs text-ink-soft">
          Confidence:{" "}
          <span className="font-medium text-ink-mid">{confidence}</span>
        </span>
      </div>
    </div>
  );
}
