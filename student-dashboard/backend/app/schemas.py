from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

StudentStatus = Literal["active", "inactive", "graduated"]
AttendanceStatus = Literal["present", "late", "excused", "absent"]


# --- Students ---------------------------------------------------------------


class StudentBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    date_of_birth: date | None = None
    grade_level: int = Field(ge=1, le=12)
    status: StudentStatus = "active"


class StudentCreate(StudentBase):
    enrolled_on: date | None = None


class StudentUpdate(BaseModel):
    """Every field optional so the frontend can PATCH-style a partial edit."""

    first_name: str | None = Field(default=None, min_length=1, max_length=60)
    last_name: str | None = Field(default=None, min_length=1, max_length=60)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    date_of_birth: date | None = None
    grade_level: int | None = Field(default=None, ge=1, le=12)
    status: StudentStatus | None = None


class StudentRead(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrolled_on: date
    full_name: str


class StudentListItem(StudentRead):
    courses_count: int = 0
    average_score: float | None = None
    attendance_rate: float | None = None


class StudentPage(BaseModel):
    items: list[StudentListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Courses ----------------------------------------------------------------


class CourseBase(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=1, max_length=140)
    department: str = Field(min_length=1, max_length=60)
    instructor: str = Field(min_length=1, max_length=80)
    credits: int = Field(default=3, ge=1, le=12)


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=140)
    department: str | None = Field(default=None, min_length=1, max_length=60)
    instructor: str | None = Field(default=None, min_length=1, max_length=80)
    credits: int | None = Field(default=None, ge=1, le=12)


class CourseRead(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class CourseListItem(CourseRead):
    enrolled_count: int = 0
    average_score: float | None = None


# --- Enrollments ------------------------------------------------------------


class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int
    score: float | None = Field(default=None, ge=0, le=100)


class EnrollmentUpdate(BaseModel):
    score: float | None = Field(default=None, ge=0, le=100)


class EnrollmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    course_id: int
    score: float | None
    enrolled_on: date
    course_code: str
    course_name: str
    department: str
    credits: int


# --- Attendance -------------------------------------------------------------


class AttendanceUpsert(BaseModel):
    student_id: int
    day: date
    status: AttendanceStatus


class AttendanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    day: date
    status: AttendanceStatus


class AttendanceSummary(BaseModel):
    present: int = 0
    late: int = 0
    excused: int = 0
    absent: int = 0
    total: int = 0
    rate: float | None = None


class StudentDetail(StudentRead):
    enrollments: list[EnrollmentRead]
    attendance: AttendanceSummary
    average_score: float | None = None


# --- Stats ------------------------------------------------------------------


class StatsSummary(BaseModel):
    total_students: int
    active_students: int
    total_courses: int
    total_enrollments: int
    average_score: float | None
    attendance_rate: float | None


class CountPoint(BaseModel):
    label: str
    value: float


class TrendPoint(BaseModel):
    day: date
    rate: float
    recorded: int


class DashboardStats(BaseModel):
    summary: StatsSummary
    by_department: list[CountPoint]
    grade_distribution: list[CountPoint]
    by_grade_level: list[CountPoint]
    attendance_trend: list[TrendPoint]
    attendance_breakdown: AttendanceSummary
