import type {
  AttendanceStatus,
  Course,
  CourseInput,
  CourseListItem,
  DashboardStats,
  Enrollment,
  Student,
  StudentDetail,
  StudentInput,
  StudentPage,
  StudentQuery,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(detailToMessage(body.detail) ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** FastAPI returns a string for HTTPException and an array for validation errors. */
function detailToMessage(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
        return field ? `${field}: ${item.msg}` : item?.msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  return null;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// --- students ---------------------------------------------------------------

export async function fetchStudents(query: StudentQuery = {}): Promise<StudentPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const res = await fetch(`${API_URL}/api/students?${params.toString()}`, { cache: "no-store" });
  return handle<StudentPage>(res);
}

export async function fetchStudent(id: number): Promise<StudentDetail> {
  const res = await fetch(`${API_URL}/api/students/${id}`, { cache: "no-store" });
  return handle<StudentDetail>(res);
}

export async function createStudent(input: StudentInput): Promise<Student> {
  return handle<Student>(await fetch(`${API_URL}/api/students`, json("POST", input)));
}

export async function updateStudent(id: number, input: StudentInput): Promise<Student> {
  return handle<Student>(await fetch(`${API_URL}/api/students/${id}`, json("PUT", input)));
}

export async function deleteStudent(id: number): Promise<void> {
  return handle<void>(await fetch(`${API_URL}/api/students/${id}`, { method: "DELETE" }));
}

// --- courses ----------------------------------------------------------------

export async function fetchCourses(): Promise<CourseListItem[]> {
  const res = await fetch(`${API_URL}/api/courses`, { cache: "no-store" });
  return handle<CourseListItem[]>(res);
}

export async function createCourse(input: CourseInput): Promise<Course> {
  return handle<Course>(await fetch(`${API_URL}/api/courses`, json("POST", input)));
}

export async function updateCourse(id: number, input: CourseInput): Promise<Course> {
  return handle<Course>(await fetch(`${API_URL}/api/courses/${id}`, json("PUT", input)));
}

export async function deleteCourse(id: number): Promise<void> {
  return handle<void>(await fetch(`${API_URL}/api/courses/${id}`, { method: "DELETE" }));
}

// --- enrollments & attendance ----------------------------------------------

export async function createEnrollment(
  studentId: number,
  courseId: number,
  score: number | null,
): Promise<Enrollment> {
  const body = { student_id: studentId, course_id: courseId, score };
  return handle<Enrollment>(await fetch(`${API_URL}/api/enrollments`, json("POST", body)));
}

export async function updateEnrollmentScore(id: number, score: number | null): Promise<Enrollment> {
  return handle<Enrollment>(await fetch(`${API_URL}/api/enrollments/${id}`, json("PUT", { score })));
}

export async function deleteEnrollment(id: number): Promise<void> {
  return handle<void>(await fetch(`${API_URL}/api/enrollments/${id}`, { method: "DELETE" }));
}

export async function markAttendance(
  studentId: number,
  day: string,
  status: AttendanceStatus,
): Promise<void> {
  const body = { student_id: studentId, day, status };
  await handle(await fetch(`${API_URL}/api/attendance`, json("POST", body)));
}

// --- stats ------------------------------------------------------------------

export async function fetchStats(trendDays = 14): Promise<DashboardStats> {
  const res = await fetch(`${API_URL}/api/stats?trend_days=${trendDays}`, { cache: "no-store" });
  return handle<DashboardStats>(res);
}
