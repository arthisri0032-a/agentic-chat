"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createStudent, updateStudent } from "@/lib/api";
import type { Student, StudentInput, StudentStatus } from "@/lib/types";

const GRADE_LEVELS = [9, 10, 11, 12];
const STATUSES: StudentStatus[] = ["active", "inactive", "graduated"];

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500";

function emptyForm(): StudentInput {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    grade_level: 9,
    status: "active",
  };
}

export default function StudentFormModal({
  student,
  onClose,
  onSaved,
}: {
  /** Null creates a new student; a record edits it. */
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StudentInput>(
    student
      ? {
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          phone: student.phone ?? "",
          date_of_birth: student.date_of_birth ?? "",
          grade_level: student.grade_level,
          status: student.status,
        }
      : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // Blank optional fields go to the API as null rather than empty strings.
    const payload: StudentInput = {
      ...form,
      email: form.email.trim(),
      phone: form.phone?.trim() ? form.phone.trim() : null,
      date_of_birth: form.date_of_birth ? form.date_of_birth : null,
    };

    try {
      if (student) await updateStudent(student.id, payload);
      else await createStudent(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the student.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={student ? `Edit ${student.full_name}` : "Add student"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600">First name</span>
            <input
              required
              maxLength={60}
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Last name</span>
            <input
              required
              maxLength={60}
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <label className="text-sm">
          <span className="text-slate-600">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Phone</span>
            <input
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Date of birth</span>
            <input
              type="date"
              value={form.date_of_birth ?? ""}
              onChange={(e) => set("date_of_birth", e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Grade level</span>
            <select
              value={form.grade_level}
              onChange={(e) => set("grade_level", Number(e.target.value))}
              className={`${inputClass} mt-1`}
            >
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Grade {level}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Status</span>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as StudentStatus)}
              className={`${inputClass} mt-1 capitalize`}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status} className="capitalize">
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700 border border-red-100">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-sm px-3.5 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : student ? "Save changes" : "Add student"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
