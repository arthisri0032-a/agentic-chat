"use client";

import { useEffect, useState } from "react";
import BarChart from "@/components/charts/BarChart";
import ChartCard from "@/components/charts/ChartCard";
import ColumnChart from "@/components/charts/ColumnChart";
import LineChart from "@/components/charts/LineChart";
import StatTile from "@/components/StatTile";
import StatusPill from "@/components/StatusPill";
import { fetchStats } from "@/lib/api";
import { compact, formatShortDate, percent, score } from "@/lib/format";
import type { AttendanceStatus, DashboardStats } from "@/lib/types";

// One hue, light→dark, for the ordered A…F bands. Validated as an ordinal ramp
// against the white card surface (see globals.css).
const GRADE_RAMP = [
  "var(--ordinal-1)",
  "var(--ordinal-2)",
  "var(--ordinal-3)",
  "var(--ordinal-4)",
  "var(--ordinal-5)",
];

const BREAKDOWN_ORDER: AttendanceStatus[] = ["present", "late", "excused", "absent"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats(14)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="p-8 text-sm text-slate-400">Loading dashboard…</p>;
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <p className="text-sm rounded-lg px-4 py-3 bg-red-50 text-red-700 border border-red-100">
          {error ?? "No statistics available."} Is the API running on{" "}
          {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}?
        </p>
      </div>
    );
  }

  const { summary, by_department, grade_distribution, by_grade_level, attendance_trend } = stats;
  const breakdown = stats.attendance_breakdown;
  const gradedTotal = grade_distribution.reduce((total, band) => total + band.value, 0);
  const enrollmentTotal = by_department.reduce((total, dept) => total + dept.value, 0);

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Enrolment, grades and attendance across Northgate School.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-4">
        <div className="lg:col-span-2">
          <StatTile
            hero
            label="Students on roll"
            value={compact(summary.total_students)}
            hint={`${summary.active_students} currently active`}
            accent="#2a78d6"
          />
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatTile label="Courses" value={compact(summary.total_courses)} accent="#eb6834" />
          <StatTile label="Enrolments" value={compact(summary.total_enrollments)} accent="#1baf7a" />
          <StatTile
            label="Average score"
            value={score(summary.average_score)}
            hint="Across graded enrolments"
            accent="#4a3aa7"
          />
          <StatTile
            label="Attendance rate"
            value={percent(summary.attendance_rate)}
            hint="Present or late"
            accent="#008300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="xl:col-span-2">
          <ChartCard
            title="Attendance rate"
            subtitle="Share of marks recorded as present or late, last 14 school days."
            accent="#2a78d6"
            tableHead={["Day", "Attendance rate", "Marks recorded"]}
            tableRows={attendance_trend.map((point) => [
              formatShortDate(point.day),
              percent(point.rate),
              point.recorded,
            ])}
          >
            <LineChart
              data={attendance_trend.map((point) => ({
                label: formatShortDate(point.day),
                value: point.rate,
                hint: `${point.recorded} marks recorded`,
              }))}
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Enrolments by department"
          subtitle={`${enrollmentTotal.toLocaleString("en-US")} enrolments across ${by_department.length} departments.`}
          accent="#eb6834"
          tableHead={["Department", "Enrolments"]}
          tableRows={by_department.map((point) => [point.label, point.value])}
        >
          <BarChart
            data={by_department}
            tooltipHint={(datum) =>
              `${((datum.value / Math.max(enrollmentTotal, 1)) * 100).toFixed(1)}% of enrolments`
            }
          />
        </ChartCard>

        <ChartCard
          title="Grade distribution"
          subtitle={`Letter band for each of the ${gradedTotal.toLocaleString("en-US")} graded enrolments.`}
          accent="#4a3aa7"
          tableHead={["Grade", "Enrolments"]}
          tableRows={grade_distribution.map((band) => [band.label, band.value])}
        >
          <ColumnChart
            data={grade_distribution}
            colors={GRADE_RAMP}
            tooltipHint={(datum) =>
              `${((datum.value / Math.max(gradedTotal, 1)) * 100).toFixed(1)}% of graded enrolments`
            }
          />
        </ChartCard>

        <ChartCard
          title="Headcount by grade level"
          subtitle="Every student on roll, including inactive and graduated."
          accent="#1baf7a"
          tableHead={["Grade level", "Students"]}
          tableRows={by_grade_level.map((point) => [point.label, point.value])}
        >
          <ColumnChart data={by_grade_level} />
        </ChartCard>

        <section
          className="bg-[var(--panel)] rounded-xl border border-slate-200/80 p-5"
          style={{ borderTop: "3px solid #008300" }}
        >
          <h2 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
            <span aria-hidden className="w-2 h-2 rounded-full shrink-0 bg-[#008300]" />
            Attendance marks
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Every mark on record, by status. These four are close in value, so they read as
            numbers rather than as a chart.
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {BREAKDOWN_ORDER.map((status) => (
              <div key={status} className="flex items-center justify-between border-b border-slate-900/10 pb-2">
                <dt>
                  <StatusPill status={status} kind="attendance" />
                </dt>
                <dd className="text-sm text-slate-800 tabular">
                  {breakdown[status].toLocaleString("en-US")}
                  <span className="text-xs text-slate-400 ml-1.5">
                    {((breakdown[status] / Math.max(breakdown.total, 1)) * 100).toFixed(1)}%
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-400 mt-4">
            {breakdown.total.toLocaleString("en-US")} marks recorded in total.
          </p>
        </section>
      </div>
    </div>
  );
}
