"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import StatusPill from "@/components/StatusPill";
import StudentFormModal from "@/components/StudentFormModal";
import { deleteStudent, fetchStudents } from "@/lib/api";
import { formatDate, percent, score } from "@/lib/format";
import type { Student, StudentListItem, StudentPage, StudentStatus } from "@/lib/types";

const PAGE_SIZE = 15;
const GRADE_LEVELS = [9, 10, 11, 12];
const STATUSES: StudentStatus[] = ["active", "inactive", "graduated"];

const SORT_COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: "last_name", label: "Student", sortable: true },
  { key: "grade_level", label: "Grade", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "courses", label: "Courses", sortable: false },
  { key: "average", label: "Avg score", sortable: false },
  { key: "attendance", label: "Attendance", sortable: false },
  { key: "enrolled_on", label: "Enrolled", sortable: true },
];

const controlClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500";

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number | "">("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [sort, setSort] = useState("last_name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<StudentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gradeLevel, status, sort, order]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchStudents({
          search: debouncedSearch,
          grade_level: gradeLevel,
          status,
          sort,
          order,
          page,
          page_size: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, gradeLevel, status, sort, order, page]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(key: string) {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setOrder("asc");
    }
  }

  async function handleDelete(student: StudentListItem) {
    if (!window.confirm(`Delete ${student.full_name}? This also removes their enrolments and attendance.`)) {
      return;
    }
    try {
      await deleteStudent(student.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the student.");
    }
  }

  const items = data?.items ?? [];

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.total.toLocaleString("en-US")} students match the current filters.` : "…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="text-sm px-3.5 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 shrink-0"
        >
          Add student
        </button>
      </header>

      {/* One filter row above everything it scopes. */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className={`${controlClass} flex-1 min-w-56`}
        />
        <select
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value === "" ? "" : Number(e.target.value))}
          className={controlClass}
        >
          <option value="">All grade levels</option>
          {GRADE_LEVELS.map((level) => (
            <option key={level} value={level}>
              Grade {level}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StudentStatus | "")}
          className={`${controlClass} capitalize`}
        >
          <option value="">All statuses</option>
          {STATUSES.map((option) => (
            <option key={option} value={option} className="capitalize">
              {option}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm rounded-lg px-4 py-3 mb-4 bg-red-50 text-red-700 border border-red-100">
          {error}
        </p>
      )}

      {/* Refetches hold the previous render at reduced opacity — no skeleton flash. */}
      <div
        className={`bg-[var(--panel)] rounded-xl border border-slate-200/80 overflow-hidden transition-opacity ${
          loading && data ? "opacity-60" : ""
        }`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              {SORT_COLUMNS.map((column, index) => (
                <th key={column.key} className={`px-4 py-3 font-medium ${index > 1 ? "text-right" : ""}`}>
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="hover:text-slate-600 uppercase tracking-wide"
                    >
                      {column.label}
                      {sort === column.key && <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((student) => (
              <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar seed={student.email} name={student.full_name} size={32} />
                    <div>
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-slate-900 hover:text-brand-600"
                      >
                        {student.full_name}
                      </Link>
                      <div className="text-xs text-slate-400">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600 tabular">{student.grade_level}</td>
                <td className="px-4 py-2.5 text-right">
                  <StatusPill status={student.status} />
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">{student.courses_count}</td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">
                  {score(student.average_score)}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">
                  {percent(student.attendance_rate)}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-500 tabular whitespace-nowrap">
                  {formatDate(student.enrolled_on)}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(student);
                      setShowForm(true);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 px-1.5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(student)}
                    className="text-xs text-slate-500 hover:text-red-600 px-1.5"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  No students match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {data.page} of {data.total_pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={data.page <= 1}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-[var(--panel)] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(data.total_pages, current + 1))}
              disabled={data.page >= data.total_pages}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-[var(--panel)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <StudentFormModal
          student={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}
