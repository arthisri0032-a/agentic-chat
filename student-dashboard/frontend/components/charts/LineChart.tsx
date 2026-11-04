"use client";

import { useState } from "react";
import Tooltip from "./Tooltip";

const VB_W = 720;
const VB_H = 280;
const PAD = { top: 24, right: 58, bottom: 40, left: 46 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

export interface LinePoint {
  label: string;
  value: number;
  hint?: string;
}

interface Props {
  data: LinePoint[];
  valueLabel?: (value: number) => string;
  /** Roughly how many x-axis ticks to print; the rest are carried by the tooltip. */
  xTickCount?: number;
}

export default function LineChart({ data, valueLabel, xTickCount = 6 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-10 text-center">No data to chart yet.</p>;
  }

  const format = valueLabel ?? ((value: number) => `${value.toFixed(1)}%`);
  const baseline = PAD.top + PLOT_H;

  // A rate axis is anchored at 0 so the line never exaggerates its own variation.
  const x = (index: number) =>
    data.length === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (index / (data.length - 1)) * PLOT_W;
  const y = (value: number) => baseline - (Math.max(0, Math.min(100, value)) / 100) * PLOT_H;

  const linePath = data.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${baseline} L ${x(0)} ${baseline} Z`;

  const lastIndex = data.length - 1;
  const lowIndex = data.reduce((low, point, index) => (point.value < data[low].value ? index : low), 0);
  // Only call out the dip when it is far enough from the end label to not collide.
  const showLow = lastIndex - lowIndex > 2;

  const tickStride = Math.max(1, Math.ceil(data.length / xTickCount));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")}
      >
        {Y_TICKS.map((tick) => (
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
              {tick}
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

        <path d={areaPath} fill="var(--series-1)" opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) =>
          index % tickStride === 0 || index === lastIndex ? (
            <text
              key={`tick-${point.label}`}
              x={x(index)}
              y={baseline + 20}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-muted)"
            >
              {point.label}
            </text>
          ) : null,
        )}

        {/* Crosshair for the hovered point. */}
        {hovered !== null && (
          <line
            x1={x(hovered)}
            x2={x(hovered)}
            y1={PAD.top}
            y2={baseline}
            stroke="var(--baseline)"
            strokeWidth={1}
          />
        )}

        {/* Selective direct labels: the endpoint, plus the low point when it stands apart. */}
        {showLow && (
          <>
            <circle
              cx={x(lowIndex)}
              cy={y(data[lowIndex].value)}
              r={4}
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
            <text
              x={x(lowIndex)}
              y={y(data[lowIndex].value) + 20}
              textAnchor="middle"
              fontSize={11}
              fill="var(--text-secondary)"
              className="tabular"
            >
              {format(data[lowIndex].value)}
            </text>
          </>
        )}

        <circle
          cx={x(lastIndex)}
          cy={y(data[lastIndex].value)}
          r={4.5}
          fill="var(--series-1)"
          stroke="var(--surface-1)"
          strokeWidth={2}
        />
        <text
          x={x(lastIndex) + 10}
          y={y(data[lastIndex].value)}
          dominantBaseline="middle"
          fontSize={11}
          fill="var(--text-secondary)"
          className="tabular"
        >
          {format(data[lastIndex].value)}
        </text>

        {hovered !== null && (
          <circle
            cx={x(hovered)}
            cy={y(data[hovered].value)}
            r={4.5}
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth={2}
          />
        )}

        {/* Nearest-point hit layer: one full-height band per index. */}
        {data.map((point, index) => {
          const bandWidth = data.length === 1 ? PLOT_W : PLOT_W / (data.length - 1);
          return (
            <rect
              key={`hit-${point.label}`}
              x={x(index) - bandWidth / 2}
              y={PAD.top}
              width={bandWidth}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {hovered !== null && (
        <Tooltip
          xPercent={(x(hovered) / VB_W) * 100}
          yPercent={(y(data[hovered].value) / VB_H) * 100}
          label={data[hovered].label}
          value={format(data[hovered].value)}
          hint={data[hovered].hint}
        />
      )}
    </div>
  );
}
