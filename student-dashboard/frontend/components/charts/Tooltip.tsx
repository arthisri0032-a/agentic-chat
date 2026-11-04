"use client";

/**
 * Chart tooltip. Positioned in percentages of the chart's viewBox, which lines up
 * because every chart renders its SVG at width:100% / height:auto — so viewBox
 * units and rendered pixels stay proportional at any container width.
 */
export default function Tooltip({
  xPercent,
  yPercent,
  label,
  value,
  hint,
}: {
  xPercent: number;
  yPercent: number;
  label: string;
  value: string;
  hint?: string;
}) {
  // Flip the anchor near the edges so the bubble never hangs outside the card.
  const anchorX = xPercent > 78 ? "100%" : xPercent < 22 ? "0%" : "50%";

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: `translate(-${anchorX}, calc(-100% - 10px))`,
      }}
    >
      <div className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-white shadow-lg">
        <div className="text-[11px] leading-tight text-slate-300 whitespace-nowrap">{label}</div>
        <div className="text-sm font-semibold leading-tight whitespace-nowrap">{value}</div>
        {hint && <div className="text-[11px] leading-tight text-slate-400 whitespace-nowrap">{hint}</div>}
      </div>
    </div>
  );
}
