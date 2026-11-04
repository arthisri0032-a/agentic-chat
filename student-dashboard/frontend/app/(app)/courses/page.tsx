"use client";

import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import CourseFormModal from "@/components/CourseFormModal";
import { deleteCourse, fetchCourses } from "@/lib/api";
import { departmentColor } from "@/lib/departmentColors";
import { letterGrade, score } from "@/lib/format";
import type { Course, CourseListItem } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [department, setDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses(await fetchCourses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(course: CourseListItem) {
    if (
      !window.confirm(
        `Delete ${course.code}? This also removes its ${course.enrolled_count} enrolment(s).`,
      )
    ) {
      return;
    }
    try {
      await deleteCourse(course.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the course.");
    }
  }

  const departments = Array.from(new Set(courses.map((course) => course.department))).sort();
  const visible = department ? courses.filter((course) => course.department === department) : courses;

  return (
    <div className="p-8 max-w-[1200px]">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {visible.length} course{visible.length === 1 ? "" : "s"}
            {department ? ` in ${department}` : " across every department"}.
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
          Add course
        </button>
      </header>

      <div className="mb-4">
        <select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All departments</option>
          {departments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm rounded-lg px-4 py-3 mb-4 bg-red-50 text-red-700 border border-red-100">
          {error}
        </p>
      )}

      <div
        className={`bg-[var(--panel)] rounded-xl border border-slate-200/80 overflow-hidden transition-opacity ${
          loading && courses.length ? "opacity-60" : ""
        }`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Instructor</th>
              <th className="px-4 py-3 font-medium text-right">Credits</th>
              <th className="px-4 py-3 font-medium text-right">Enrolled</th>
              <th className="px-4 py-3 font-medium text-right">Avg score</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((course) => (
              <tr key={course.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-900">{course.code}</div>
                  <div className="text-xs text-slate-400">{course.name}</div>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${departmentColor(course.department)}1f` }}
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: departmentColor(course.department) }}
                    />
                    {course.department}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Avatar seed={course.instructor} name={course.instructor} size={24} />
                    {course.instructor}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">{course.credits}</td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">{course.enrolled_count}</td>
                <td className="px-4 py-2.5 text-right text-slate-600 tabular">
                  {score(course.average_score)}
                  <span className="text-xs text-slate-400 ml-1.5">
                    {letterGrade(course.average_score)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(course);
                      setShowForm(true);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 px-1.5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course)}
                    className="text-xs text-slate-500 hover:text-red-600 px-1.5"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <CourseFormModal
          course={editing}
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
