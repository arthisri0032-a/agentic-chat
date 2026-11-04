"use client";

import { useState } from "react";
import { niceTicks } from "@/lib/format";
import Tooltip from "./Tooltip";

const VB_W = 720;
const PAD = { top: 22, right: 70, bottom: 34, left: 150 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const ROW_H = 34;
const MAX_BAR_H = 24;
const RADIUS = 4;

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  valueLabel?: (value: number) => string;
  tooltipHint?: (datum: BarDatum) => string;
}

/** Bar with a rounded data-end and square corners at the baseline. */
function tippedBar(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, Math.max(width, 0), height / 2);
  const end = x + width;
  return [
    `M ${x} ${y}`,
    `L ${end - r} ${y}`,
    `Q ${end} ${y} ${end} ${y + r}`,
    `L ${end} ${y + height - r}`,
    `Q ${end} ${y + height} ${end - r} ${y + height}`,
    `L ${x} ${y + height}`,
    "Z",
  ].join(" ");
}

export default function BarChart({ data, valueLabel, tooltipHint }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No data to chart yet.</p>;
  }

  const format = valueLabel ?? ((value: number) => value.toLocaleString("en-US"));
  const ticks = niceTicks(Math.max(...data.map((d) => d.value)));
  const domainMax = Math.max(ticks[ticks.length - 1], 1);

  // Height grows with the rows and includes the axis band, so nothing gets clipped.
  const plotH = data.length * ROW_H;
  const vbH = PAD.top + plotH + PAD.bottom;
  const barHeight = Math.min(MAX_BAR_H, ROW_H - 12);

  const x = (value: number) => (value / domainMax) * PLOT_W;
  const rowTop = (index: number) => PAD.top + index * ROW_H;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${vbH}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left + x(tick)}
              x2={PAD.left + x(tick)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left + x(tick)}
              y={PAD.top + plotH + 18}
              textAnchor="middle"
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
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="var(--baseline)"
          strokeWidth={1}
        />

        {data.map((datum, index) => {
          const top = rowTop(index) + (ROW_H - barHeight) / 2;
          const width = x(datum.value);

          return (
            <g key={datum.label}>
              <text
                x={PAD.left - 12}
                y={top + barHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fill="var(--text-secondary)"
              >
                {datum.label}
              </text>
              <path
                d={tippedBar(PAD.left, top, width, barHeight)}
                fill="var(--series-1)"
                opacity={hovered === null || hovered === index ? 1 : 0.55}
              />
              {/* Value at the tip. */}
              <text
                x={PAD.left + width + 8}
                y={top + barHeight / 2}
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--text-secondary)"
                className="tabular"
              >
                {format(datum.value)}
              </text>
              <rect
                x={PAD.left}
                y={rowTop(index)}
                width={PLOT_W + PAD.right}
                height={ROW_H}
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
          xPercent={((PAD.left + x(data[hovered].value)) / VB_W) * 100}
          yPercent={((rowTop(hovered) + ROW_H / 2) / vbH) * 100}
          label={data[hovered].label}
          value={format(data[hovered].value)}
          hint={tooltipHint?.(data[hovered])}
        />
      )}
    </div>
  );
}
