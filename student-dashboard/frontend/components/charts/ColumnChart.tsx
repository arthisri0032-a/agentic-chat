"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import Tooltip from "./Tooltip";

const VB_W = 720;
const VB_H = 300;
const PAD = { top: 26, right: 16, bottom: 46, left: 50 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;
const MAX_BAR_W = 24; // marks stay thin; the band's leftover is air
const RADIUS = 4;

export interface ColumnDatum {
  label: string;
  value: number;
}

interface Props {
  data: ColumnDatum[];
  /** One colour per column for an ordered band ramp; omit for the single series hue. */
  colors?: string[];
  valueLabel?: (value: number) => string;
  tooltipHint?: (datum: ColumnDatum) => string;
}

/** Column with a rounded cap and square corners at the baseline. */
function cappedColumn(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, width / 2, Math.max(height, 0));
  const bottom = y + height;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

export default function ColumnChart({ data, colors, valueLabel, tooltipHint }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No data to chart yet.</p>;
  }

  const format = valueLabel ?? ((value: number) => value.toLocaleString("en-US"));
  const ticks = niceTicks(Math.max(...data.map((d) => d.value)));
  const domainMax = Math.max(ticks[ticks.length - 1], 1);

  const band = PLOT_W / data.length;
  const barWidth = Math.max(6, Math.min(MAX_BAR_W, band - 14));
  const baseline = PAD.top + PLOT_H;

  const y = (value: number) => baseline - (value / domainMax) * PLOT_H;
  const centerOf = (index: number) => PAD.left + band * index + band / 2;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--text-muted)"
              className="tabular"
            >
              {tick.toLocaleString("en-US")}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={baseline}
          y2={baseline}
          stroke="var(--baseline)"
          strokeWidth={1}
        />

        {data.map((datum, index) => {
          const top = y(datum.value);
          const height = baseline - top;
          const center = centerOf(index);
          const fill = colors?.[index] ?? "var(--series-1)";

          return (
            <g key={datum.label}>
              <path
                d={cappedColumn(center - barWidth / 2, top, barWidth, height)}
                fill={fill}
                opacity={hovered === null || hovered === index ? 1 : 0.55}
              />
              {/* Value on the cap. */}
              <text
                x={center}
                y={top - 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-secondary)"
                className="tabular"
              >
                {format(datum.value)}
              </text>
              <text
                x={center}
                y={baseline + 20}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {datum.label}
              </text>
              {/* Hit target spans the whole band, not just the thin mark. */}
              <rect
                x={PAD.left + band * index}
                y={PAD.top}
                width={band}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <Tooltip
          xPercent={(centerOf(hovered) / VB_W) * 100}
          yPercent={(y(data[hovered].value) / VB_H) * 100}
          label={data[hovered].label}
          value={format(data[hovered].value)}
          hint={tooltipHint?.(data[hovered])}
        />
      )}
    </div>
  );
}
