"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  /** Card identity colour — a top border + title dot. */
  accent?: string;
  /** The rendered chart. */
  children: ReactNode;
  /** Table-view twin — every charted value stays reachable without relying on colour. */
  tableHead: string[];
  tableRows: (string | number)[][];
}

export default function ChartCard({ title, subtitle, accent = "#2a78d6", children, tableHead, tableRows }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section
      className="bg-[var(--panel)] rounded-xl border border-slate-200/80 p-5"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
            <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex rounded-lg border border-slate-200 p-0.5 shrink-0" role="group">
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              aria-pressed={view === option}
              className={`text-xs px-2.5 py-1 rounded-md capitalize transition-colors ${
                view === option
                  ? "bg-slate-100 text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </header>

      {view === "chart" ? (
        children
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--panel)]">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                {tableHead.map((heading, index) => (
                  <th key={heading} className={`pb-2 font-medium ${index > 0 ? "text-right" : ""}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-slate-100">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`py-1.5 ${
                        cellIndex > 0 ? "text-right tabular text-slate-600" : "text-slate-800"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
