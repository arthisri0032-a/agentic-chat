"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import StatTile from "@/components/StatTile";
import StatusPill from "@/components/StatusPill";
import StudentFormModal from "@/components/StudentFormModal";
import {
  createEnrollment,
  deleteEnrollment,
  fetchCourses,
  fetchStudent,
  markAttendance,
  updateEnrollmentScore,
} from "@/lib/api";
import { departmentColor } from "@/lib/departmentColors";
import { formatDate, letterGrade, percent, score } from "@/lib/format";
import type { AttendanceStatus, CourseListItem, StudentDetail } from "@/lib/types";

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["present", "late", "excused", "absent"];

const controlClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = Number(params.id);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [newCourseId, setNewCourseId] = useState<string>("");
  const [attendanceDay, setAttendanceDay] = useState(today());
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("present");

  const load = useCallback(async () => {
    setError(null);
    try {
      setStudent(await fetchStudent(studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this student.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
    fetchCourses().then(setCourses).catch(() => setCourses([]));
  }, [load]);

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed.");
    }
  }

  if (loading) return <p className="p-8 text-sm text-slate-400">Loading student…</p>;

  if (error && !student) {
    return (
      <div className="p-8">
        <p className="text-sm rounded-lg px-4 py-3 bg-red-50 text-red-700 border border-red-100">{error}</p>
        <Link href="/students" className="text-sm text-brand-600 hover:text-brand-700 mt-4 inline-block">
          ← Back to students
        </Link>
      </div>
    );
  }

  if (!student) return null;

  const enrolledCourseIds = new Set(student.enrollments.map((enrollment) => enrollment.course_id));
  const availableCourses = courses.filter((course) => !enrolledCourseIds.has(course.id));

  return (
    <div className="p-8 max-w-[1100px]">
      <Link href="/students" className="text-sm text-slate-500 hover:text-slate-700">
        ← Students
      </Link>

      <header className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div className="flex items-center gap-4">
          <Avatar seed={student.email} name={student.full_name} size={56} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{student.full_name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
              <span>{student.email}</span>
              <span aria-hidden>·</span>
              <span>Grade {student.grade_level}</span>
              <span aria-hidden>·</span>
              <StatusPill status={student.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-[var(--panel)]"
          >
            Edit
          </button>
        </div>
      </header>

      {error && (
        <p className="text-sm rounded-lg px-4 py-3 mb-4 bg-red-50 text-red-700 border border-red-100">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm rounded-lg px-4 py-3 mb-4 bg-brand-50 text-brand-700 border border-brand-100">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="Courses" value={String(student.enrollments.length)} accent="#eb6834" />
        <StatTile
          label="Average score"
          value={score(student.average_score)}
          hint={`Grade ${letterGrade(student.average_score)}`}
          accent="#4a3aa7"
        />
        <StatTile
          label="Attendance rate"
          value={percent(student.attendance.rate)}
          hint={`${student.attendance.total} marks on record`}
          accent="#008300"
        />
        <StatTile label="Enrolled" value={formatDate(student.enrolled_on)} accent="#1baf7a" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-[var(--panel)] rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Enrolments &amp; grades</h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                <th className="pb-2 font-medium">Course</th>
                <th className="pb-2 font-medium text-right">Credits</th>
                <th className="pb-2 font-medium text-right">Score</th>
                <th className="pb-2 font-medium text-right">Grade</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {student.enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">
                    <div className="font-medium text-slate-800">{enrollment.course_code}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>{enrollment.course_name}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          aria-hidden
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: departmentColor(enrollment.department) }}
                        />
                        {enrollment.department}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-slate-600 tabular">{enrollment.credits}</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      defaultValue={enrollment.score ?? ""}
                      onBlur={(event) => {
                        const raw = event.target.value.trim();
                        const next = raw === "" ? null : Number(raw);
                        if (next === (enrollment.score ?? null)) return;
                        run(() => updateEnrollmentScore(enrollment.id, next));
                      }}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-right tabular focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </td>
                  <td className="py-2 text-right text-slate-600 tabular">
                    {letterGrade(enrollment.score)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => run(() => deleteEnrollment(enrollment.id))}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {student.enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Not enrolled in any courses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <select
              value={newCourseId}
              onChange={(event) => setNewCourseId(event.target.value)}
              className={`${controlClass} flex-1`}
            >
              <option value="">Add a course…</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!newCourseId}
              onClick={() =>
                run(async () => {
                  await createEnrollment(student.id, Number(newCourseId), null);
                  setNewCourseId("");
                })
              }
              className="text-sm px-3.5 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-40"
            >
              Enrol
            </button>
          </div>
        </section>

        <section className="bg-[var(--panel)] rounded-xl border border-slate-200/80 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Attendance</h2>

          <dl className="flex flex-col gap-2 mb-5">
            {ATTENDANCE_OPTIONS.map((option) => (
              <div key={option} className="flex items-center justify-between">
                <dt>
                  <StatusPill status={option} kind="attendance" />
                </dt>
                <dd className="text-sm text-slate-700 tabular">{student.attendance[option]}</dd>
              </div>
            ))}
          </dl>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <label className="text-xs text-slate-500">Record a mark</label>
            <input
              type="date"
              value={attendanceDay}
              onChange={(event) => setAttendanceDay(event.target.value)}
              className={controlClass}
            />
            <select
              value={attendanceStatus}
              onChange={(event) => setAttendanceStatus(event.target.value as AttendanceStatus)}
              className={`${controlClass} capitalize`}
            >
              {ATTENDANCE_OPTIONS.map((option) => (
                <option key={option} value={option} className="capitalize">
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                run(
                  () => markAttendance(student.id, attendanceDay, attendanceStatus),
                  `Marked ${attendanceStatus} for ${formatDate(attendanceDay)}.`,
                )
              }
              className="text-sm px-3.5 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600"
            >
              Save mark
            </button>
            <p className="text-xs text-slate-400">
              One mark per day — saving again replaces that day&apos;s status.
            </p>
          </div>
        </section>
      </div>

      {showForm && (
        <StudentFormModal
          student={student}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
