import type { AttendanceStatus, StudentStatus } from "@/lib/types";

/**
 * Status always ships as dot + word, never colour alone — two of these hues sit
 * below 3:1 on a white surface by design. The pill's tint is a light wash of
 * the same hue for a splash of colour; the label text stays neutral ink so
 * legibility never depends on the hue's own contrast.
 */
const STUDENT_STYLE: Record<StudentStatus, { dot: string; tint: string }> = {
  active: { dot: "#0ca30c", tint: "#e8f7e9" },
  inactive: { dot: "#fab219", tint: "#fff6e0" },
  graduated: { dot: "#2a78d6", tint: "#eaf1fc" },
};

const ATTENDANCE_STYLE: Record<AttendanceStatus, { dot: string; tint: string }> = {
  present: { dot: "#0ca30c", tint: "#e8f7e9" },
  late: { dot: "#fab219", tint: "#fff6e0" },
  excused: { dot: "#ec835a", tint: "#fdece3" },
  absent: { dot: "#d03b3b", tint: "#fbe6e6" },
};

export default function StatusPill({
  status,
  kind = "student",
}: {
  status: StudentStatus | AttendanceStatus;
  kind?: "student" | "attendance";
}) {
  const { dot, tint } =
    kind === "student"
      ? STUDENT_STYLE[status as StudentStatus]
      : ATTENDANCE_STYLE[status as AttendanceStatus];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 capitalize px-2 py-0.5 rounded-full"
      style={{ backgroundColor: tint }}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
      {status}
    </span>
  );
}
