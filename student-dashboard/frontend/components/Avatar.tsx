"use client";

import { useState } from "react";

/**
 * Illustrated avatar (DiceBear, seeded deterministically per person) with an
 * initials fallback if the avatar service is unreachable — e.g. offline.
 * Decorative: the name is always shown as text right next to it, so the
 * image carries no information a screen reader would need (alt="").
 */
export default function Avatar({
  seed,
  name,
  size = 36,
  className = "",
}: {
  seed: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundType=solid&backgroundColor=f4f8fe`;

  if (errored) {
    return (
      <span
        aria-hidden
        className={`inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external, seed-driven URL; next/image needs a fixed remote-domain allowlist for no benefit here.
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`rounded-full shrink-0 bg-brand-50 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
