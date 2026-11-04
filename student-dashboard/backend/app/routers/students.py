from datetime import date
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceRecord, Course, Enrollment, Student
from app.queries import attendance_aggregate, enrollment_aggregate, rate
from app.schemas import (
    AttendanceSummary,
    EnrollmentRead,
    StudentCreate,
    StudentDetail,
    StudentListItem,
    StudentPage,
    StudentRead,
    StudentUpdate,
)

router = APIRouter(prefix="/api/students", tags=["students"])

SORTABLE = {
    "last_name": Student.last_name,
    "first_name": Student.first_name,
    "grade_level": Student.grade_level,
    "enrolled_on": Student.enrolled_on,
}


def _get_or_404(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(404, f"Student {student_id} not found.")
    return student


@router.get("", response_model=StudentPage)
def list_students(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, description="Matches name or email."),
    grade_level: int | None = Query(default=None, ge=1, le=12),
    status: str | None = None,
    sort: str = Query(default="last_name"),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    enrollments = enrollment_aggregate()
    attendance = attendance_aggregate()

    stmt = (
        select(
            Student,
            func.coalesce(enrollments.c.courses_count, 0).label("courses_count"),
            enrollments.c.average_score,
            attendance.c.recorded,
            attendance.c.attended,
        )
        .outerjoin(enrollments, enrollments.c.student_id == Student.id)
        .outerjoin(attendance, attendance.c.student_id == Student.id)
    )

    filters = []
    if search:
        needle = f"%{search.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Student.first_name).like(needle),
                func.lower(Student.last_name).like(needle),
                func.lower(Student.email).like(needle),
                func.lower(Student.first_name + " " + Student.last_name).like(needle),
            )
        )
    if grade_level is not None:
        filters.append(Student.grade_level == grade_level)
    if status:
        filters.append(Student.status == status)

    if filters:
        stmt = stmt.where(*filters)

    total = db.scalar(select(func.count()).select_from(Student).where(*filters)) or 0

    sort_column = SORTABLE.get(sort, Student.last_name)
    stmt = stmt.order_by(sort_column.desc() if order == "desc" else sort_column.asc(), Student.id)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    items = [
        StudentListItem(
            **StudentRead.model_validate(student).model_dump(),
            courses_count=courses_count,
            average_score=round(average_score, 1) if average_score is not None else None,
            attendance_rate=rate(attended, recorded),
        )
        for student, courses_count, average_score, recorded, attended in db.execute(stmt).all()
    ]

    return StudentPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, ceil(total / page_size)),
    )


@router.post("", response_model=StudentRead, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["enrolled_on"] = data.get("enrolled_on") or date.today()
    data["email"] = str(data["email"]).lower()

    student = Student(**data)
    db.add(student)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"A student with email {data['email']} already exists.") from exc
    db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentDetail)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = _get_or_404(db, student_id)

    rows = db.execute(
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.student_id == student_id)
        .order_by(Course.code)
    ).all()

    enrollments = [
        EnrollmentRead(
            id=enrollment.id,
            student_id=enrollment.student_id,
            course_id=enrollment.course_id,
            score=enrollment.score,
            enrolled_on=enrollment.enrolled_on,
            course_code=course.code,
            course_name=course.name,
            department=course.department,
            credits=course.credits,
        )
        for enrollment, course in rows
    ]

    counts = dict(
        db.execute(
            select(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .where(AttendanceRecord.student_id == student_id)
            .group_by(AttendanceRecord.status)
        ).all()
    )
    recorded = sum(counts.values())
    attendance = AttendanceSummary(
        present=counts.get("present", 0),
        late=counts.get("late", 0),
        excused=counts.get("excused", 0),
        absent=counts.get("absent", 0),
        total=recorded,
        rate=rate(counts.get("present", 0) + counts.get("late", 0), recorded),
    )

    scores = [e.score for e in enrollments if e.score is not None]

    return StudentDetail(
        **StudentRead.model_validate(student).model_dump(),
        enrollments=enrollments,
        attendance=attendance,
        average_score=round(sum(scores) / len(scores), 1) if scores else None,
    )


@router.put("/{student_id}", response_model=StudentRead)
def update_student(student_id: int, payload: StudentUpdate, db: Session = Depends(get_db)):
    student = _get_or_404(db, student_id)

    updates = payload.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] is not None:
        updates["email"] = str(updates["email"]).lower()

    for field, value in updates.items():
        setattr(student, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Another student already uses that email address.") from exc
    db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = _get_or_404(db, student_id)
    db.delete(student)
    db.commit()
