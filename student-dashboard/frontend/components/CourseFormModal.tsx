"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createCourse, updateCourse } from "@/lib/api";
import type { Course, CourseInput } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500";

export default function CourseFormModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CourseInput>(
    course
      ? {
          code: course.code,
          name: course.name,
          department: course.department,
          instructor: course.instructor,
          credits: course.credits,
        }
      : { code: "", name: "", department: "", instructor: "", credits: 3 },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof CourseInput>(key: K, value: CourseInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (course) await updateCourse(course.id, form);
      else await createCourse(form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the course.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={course ? `Edit ${course.code}` : "Add course"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Course code</span>
            <input
              required
              minLength={2}
              maxLength={20}
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="CS101"
              className={`${inputClass} mt-1 uppercase`}
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Credits</span>
            <input
              required
              type="number"
              min={1}
              max={12}
              value={form.credits}
              onChange={(e) => set("credits", Number(e.target.value))}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <label className="text-sm">
          <span className="text-slate-600">Title</span>
          <input
            required
            maxLength={140}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-slate-600">Department</span>
            <input
              required
              maxLength={60}
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Instructor</span>
            <input
              required
              maxLength={80}
              value={form.instructor}
              onChange={(e) => set("instructor", e.target.value)}
              className={`${inputClass} mt-1`}
            />
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
            {saving ? "Saving…" : course ? "Save changes" : "Add course"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
