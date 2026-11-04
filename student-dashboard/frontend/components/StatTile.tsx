/**
 * Stat tile: label · value · optional hint. The value keeps the font's default
 * proportional figures — `tabular-nums` makes a large standalone number look loose.
 * Every tile carries a colour wash (light fill + left bar in the accent hue)
 * rather than sitting on a plain white card.
 */
export default function StatTile({
  label,
  value,
  hint,
  hero = false,
  accent = "#2a78d6",
}: {
  label: string;
  value: string;
  hint?: string;
  /** Exactly one tile per view leads with the hero figure. */
  hero?: boolean;
  /** Hex colour for the tile's wash and left bar. Defaults to brand blue. */
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 border"
      style={{
        backgroundColor: `${accent}17`,
        borderColor: `${accent}35`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`font-semibold text-slate-900 leading-tight mt-1 ${hero ? "text-5xl" : "text-2xl"}`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
