"use client";

import { useState } from "react";

type BarChartProps = {
  data: { month: string; income: number; expense: number }[];
  currency?: string;
};

export function BarChart({ data, currency = "USD" }: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  const W = 600;
  const H = 260;
  const PADDING_LEFT = 60;
  const PADDING_BOTTOM = 36;
  const PADDING_TOP = 16;
  const chartW = W - PADDING_LEFT - 16;
  const chartH = H - PADDING_BOTTOM - PADDING_TOP;
  const groupW = chartW / data.length;
  const barW = Math.min(groupW * 0.3, 28);
  const gap = 4;

  const gridLines = 4;
  const step = maxVal / gridLines;

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n.toFixed(0);

  return (
    <div className="w-full">
      <svg className="w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = PADDING_TOP + chartH - (i * chartH) / gridLines;
          const val = i * step;
          return (
            <g key={i}>
              <line x1={PADDING_LEFT} y1={y} x2={W - 16} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PADDING_LEFT - 8} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
                {fmt(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx = PADDING_LEFT + groupW * i + groupW / 2;
          const incomeH = (d.income / maxVal) * chartH;
          const expenseH = (d.expense / maxVal) * chartH;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.month}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-default"
            >
              {/* Hover backdrop */}
              {isHovered && (
                <rect
                  x={PADDING_LEFT + groupW * i}
                  y={PADDING_TOP}
                  width={groupW}
                  height={chartH}
                  fill="#087f7a"
                  opacity={0.04}
                  rx={4}
                />
              )}

              {/* Income bar */}
              <rect
                x={cx - barW - gap / 2}
                y={PADDING_TOP + chartH - incomeH}
                width={barW}
                height={Math.max(incomeH, 0)}
                rx={3}
                fill="#20875a"
                opacity={isHovered ? 1 : 0.8}
              />

              {/* Expense bar */}
              <rect
                x={cx + gap / 2}
                y={PADDING_TOP + chartH - expenseH}
                width={barW}
                height={Math.max(expenseH, 0)}
                rx={3}
                fill="#d85c46"
                opacity={isHovered ? 1 : 0.8}
              />

              {/* Month label */}
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                className={`text-[12px] font-bold ${isHovered ? "fill-ink" : "fill-muted"}`}
              >
                {d.month}
              </text>

              {/* Tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={cx - 64}
                    y={PADDING_TOP - 4}
                    width={128}
                    height={44}
                    rx={6}
                    fill="#14213d"
                  />
                  <text x={cx} y={PADDING_TOP + 14} textAnchor="middle" className="fill-[#20875a] text-[11px] font-bold">
                    +{d.income.toLocaleString()} {currency}
                  </text>
                  <text x={cx} y={PADDING_TOP + 30} textAnchor="middle" className="fill-[#d85c46] text-[11px] font-bold">
                    -{d.expense.toLocaleString()} {currency}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-5 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-mint" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-coral" /> Expense
        </span>
      </div>
    </div>
  );
}
