"use client";

import { useState } from "react";

type Slice = {
  name: string;
  amount: number;
  color: string;
};

type DonutChartProps = {
  data: Slice[];
  currency?: string;
};

export function DonutChart({ data, currency = "USD" }: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.amount, 0) || 1;
  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 76;
  const STROKE = 28;

  let cumAngle = -90;
  const slices = data.map((d, i) => {
    const pct = d.amount / total;
    const angle = pct * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...d, pct, startAngle, angle, index: i };
  });

  function polarToCartesian(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  function arcPath(startAngle: number, endAngle: number, r: number) {
    const start = polarToCartesian(startAngle, r);
    const end = polarToCartesian(endAngle, r);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const hoveredSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      {/* Donut */}
      <div className="shrink-0">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />

          {slices.map((s) => {
            const isHovered = hoveredIdx === s.index;
            const sw = isHovered ? STROKE + 6 : STROKE;
            const endAngle = s.startAngle + Math.max(s.angle - 1.5, 0.5);
            return (
              <path
                key={s.name}
                d={arcPath(s.startAngle, endAngle, R)}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeLinecap="round"
                opacity={hoveredIdx !== null && !isHovered ? 0.4 : 1}
                onMouseEnter={() => setHoveredIdx(s.index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-default transition-opacity"
              />
            );
          })}

          {/* Center text */}
          <text x={CX} y={CY - 6} textAnchor="middle" className="fill-ink text-[11px] font-bold">
            {hoveredSlice ? hoveredSlice.name : "Total"}
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle" className="fill-ink text-[18px] font-black">
            {hoveredSlice
              ? hoveredSlice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text x={CX} y={CY + 28} textAnchor="middle" className="fill-muted text-[10px]">
            {currency}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid w-full gap-2">
        {slices.map((s) => {
          const pct = (s.pct * 100).toFixed(1);
          return (
            <div
              key={s.name}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                hoveredIdx === s.index ? "bg-slate-50" : ""
              }`}
              onMouseEnter={() => setHoveredIdx(s.index)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-bold text-ink">{s.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-ink">
                  {s.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="w-12 text-right text-xs font-bold text-muted">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
