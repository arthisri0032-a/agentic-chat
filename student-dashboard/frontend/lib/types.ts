export type StudentStatus = "active" | "inactive" | "graduated";
export type AttendanceStatus = "present" | "late" | "excused" | "absent";

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  grade_level: number;
  status: StudentStatus;
  enrolled_on: string;
}

export interface StudentListItem extends Student {
  courses_count: number;
  average_score: number | null;
  attendance_rate: number | null;
}

export interface StudentPage {
  items: StudentListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  score: number | null;
  enrolled_on: string;
  course_code: string;
  course_name: string;
  department: string;
  credits: number;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  rate: number | null;
}

export interface StudentDetail extends Student {
  enrollments: Enrollment[];
  attendance: AttendanceSummary;
  average_score: number | null;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  department: string;
  instructor: string;
  credits: number;
}

export interface CourseListItem extends Course {
  enrolled_count: number;
  average_score: number | null;
}

export interface CountPoint {
  label: string;
  value: number;
}

export interface TrendPoint {
  day: string;
  rate: number;
  recorded: number;
}

export interface DashboardStats {
  summary: {
    total_students: number;
    active_students: number;
    total_courses: number;
    total_enrollments: number;
    average_score: number | null;
    attendance_rate: number | null;
  };
  by_department: CountPoint[];
  grade_distribution: CountPoint[];
  by_grade_level: CountPoint[];
  attendance_trend: TrendPoint[];
  attendance_breakdown: AttendanceSummary;
}

/** Shape the student create/edit form posts. */
export interface StudentInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  grade_level: number;
  status: StudentStatus;
}

export interface CourseInput {
  code: string;
  name: string;
  department: string;
  instructor: string;
  credits: number;
}

export interface StudentQuery {
  search?: string;
  grade_level?: number | "";
  status?: StudentStatus | "";
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}
