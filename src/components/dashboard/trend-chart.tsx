"use client";

import { useMemo, useState } from "react";

type TrendChartProps = {
  data: { date: string; amount: number }[];
  currency?: string;
};

export function TrendChart({ data, currency = "USD" }: TrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { points, maxVal, W, H, chartH, chartW, PADDING_LEFT, PADDING_TOP, gridLines, step } =
    useMemo(() => {
      const W = 600;
      const H = 220;
      const PADDING_LEFT = 54;
      const PADDING_BOTTOM = 32;
      const PADDING_TOP = 16;
      const PADDING_RIGHT = 16;
      const chartW = W - PADDING_LEFT - PADDING_RIGHT;
      const chartH = H - PADDING_BOTTOM - PADDING_TOP;

      const maxVal = Math.max(...data.map((d) => d.amount), 1);
      const gridLines = 4;
      const step = maxVal / gridLines;

      const points = data.map((d, i) => {
        const x = PADDING_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = PADDING_TOP + chartH - (d.amount / maxVal) * chartH;
        return { x, y, ...d };
      });

      return { points, maxVal, W, H, chartH, chartW, PADDING_LEFT, PADDING_TOP, gridLines, step };
    }, [data]);

  if (data.length === 0) {
    return (
      <div className="grid min-h-[160px] place-items-center text-sm text-muted">
        No spending data available for the last 30 days.
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING_TOP + chartH} L ${points[0].x} ${PADDING_TOP + chartH} Z`;

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n.toFixed(0);

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  // Show ~5 date labels
  const labelInterval = Math.max(Math.floor(data.length / 5), 1);

  return (
    <div className="w-full">
      <svg
        className="w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = PADDING_TOP + chartH - (i * chartH) / gridLines;
          return (
            <g key={i}>
              <line x1={PADDING_LEFT} y1={y} x2={W - 16} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PADDING_LEFT - 8} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
                {fmt(i * step)}
              </text>
            </g>
          );
        })}

        {/* Gradient */}
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#087f7a" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#087f7a" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#087f7a" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Hover hitboxes */}
        {points.map((p, i) => {
          const w = chartW / data.length;
          return (
            <rect
              key={p.date}
              x={p.x - w / 2}
              y={PADDING_TOP}
              width={w}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}

        {/* Date labels */}
        {points.map((p, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const d = new Date(p.date);
          const label = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
          return (
            <text key={p.date} x={p.x} y={H - 8} textAnchor="middle" className="fill-muted text-[10px]">
              {label}
            </text>
          );
        })}

        {/* Hover indicator */}
        {hovered && (
          <g>
            <line x1={hovered.x} y1={PADDING_TOP} x2={hovered.x} y2={PADDING_TOP + chartH} stroke="#087f7a" strokeWidth={1} strokeDasharray="4 3" />
            <circle cx={hovered.x} cy={hovered.y} r={5} fill="#087f7a" stroke="white" strokeWidth={2} />
            <rect x={hovered.x - 52} y={hovered.y - 32} width={104} height={24} rx={6} fill="#14213d" />
            <text x={hovered.x} y={hovered.y - 16} textAnchor="middle" className="fill-white text-[11px] font-bold">
              {hovered.amount.toLocaleString()} {currency}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
