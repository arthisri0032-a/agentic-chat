"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { fetchStudents } from "@/lib/api";
import type { StudentListItem } from "@/lib/types";

// The three feature-card hues are the reference palette's first three
// categorical slots — the only run validated all-pairs distinct (not just
// adjacent), which matters here since all three sit side by side at once.
const FEATURES = [
  {
    title: "Students",
    description: "Search, filter and manage every student record in one roster.",
    href: "/students",
    color: "#2a78d6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <circle cx="17" cy="8.5" r="2.4" />
        <path d="M15.5 13.4c2.4.3 4 2 4 4.6" />
      </svg>
    ),
  },
  {
    title: "Courses",
    description: "Departments, instructors and credit loads, all in one list.",
    href: "/courses",
    color: "#eb6834",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
        <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
      </svg>
    ),
  },
  {
    title: "Analytics",
    description: "Attendance trends, grade distributions and roll-ups at a glance.",
    href: "/dashboard",
    color: "#1baf7a",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M11 20V4M18 20v-7" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
];

/** Decorative mock of the analytics view — a hero visual, not live data. */
function DashboardPreview() {
  const bars = [38, 62, 47, 74, 55];
  return (
    <div
      aria-hidden="true"
      className="bg-[var(--panel)] rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-slate-400">Attendance rate</div>
          <div className="text-2xl font-semibold text-slate-900 mt-0.5">76.4%</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-status-good font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-status-good" />
          On track
        </div>
      </div>
      <div className="flex items-end gap-2.5 h-24">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-brand-500"
            style={{ height: `${height}%`, opacity: 0.55 + index * 0.09 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-400">Students</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">140</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Courses</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">12</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Avg score</div>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">79.7</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [preview, setPreview] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents({ page_size: 5, sort: "last_name" })
      .then((page) => {
        setPreview(page.items);
        setTotal(page.total);
      })
      .catch(() => {
        // The landing page still reads fine with the API offline — it just
        // skips the live roster teaser below the buttons.
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaf3fe] via-white to-[#eafaf3]">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
          <span aria-hidden className="w-2.5 h-2.5 rounded-sm bg-brand-500 shrink-0" />
          Northgate
        </span>
        <Link
          href="/dashboard"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
        >
          Open dashboard
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-10 pb-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 leading-tight tracking-tight">
              Every student,
              <br />
              one dashboard.
            </h1>
            <p className="text-slate-600 mt-4 text-lg max-w-md">
              Track enrolment, grades and attendance for Northgate School — one
              place for the whole roster, its courses, and classroom analytics.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/dashboard"
                className="text-sm font-medium px-5 py-3 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
              >
                Open dashboard
              </Link>
              <Link
                href="/students"
                className="text-sm font-medium px-5 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-[var(--panel)]"
              >
                Browse students
              </Link>
            </div>

            {total !== null && (
              <div className="flex items-center gap-3 mt-10">
                <div className="flex -space-x-2.5">
                  {preview.map((student) => (
                    <Avatar
                      key={student.id}
                      seed={student.email}
                      name={student.full_name}
                      size={38}
                      className="ring-2 ring-white"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-900">{total.toLocaleString("en-US")}</span>{" "}
                  students already on the roll
                </p>
              </div>
            )}
          </div>

          <DashboardPreview />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-24">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="bg-[var(--panel)] rounded-xl border border-slate-200/80 p-5 hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 [&>svg]:w-5 [&>svg]:h-5"
                style={{ backgroundColor: `${feature.color}1f`, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h2 className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                {feature.title}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs text-slate-400">
        Northgate School · Student management
      </footer>
    </div>
  );
}
