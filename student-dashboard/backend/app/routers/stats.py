from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceRecord, Course, Enrollment, Student
from app.queries import PRESENT_STATUSES, letter_grade, rate
from app.schemas import (
    AttendanceSummary,
    CountPoint,
    DashboardStats,
    StatsSummary,
    TrendPoint,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])

GRADE_BUCKETS = ("A", "B", "C", "D", "F")


@router.get("", response_model=DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    trend_days: int = Query(default=14, ge=1, le=90, description="Most recent N recorded days."),
):
    total_students = db.scalar(select(func.count()).select_from(Student)) or 0
    active_students = (
        db.scalar(select(func.count()).select_from(Student).where(Student.status == "active")) or 0
    )
    total_courses = db.scalar(select(func.count()).select_from(Course)) or 0
    total_enrollments = db.scalar(select(func.count()).select_from(Enrollment)) or 0
    average_score = db.scalar(select(func.avg(Enrollment.score)))

    # --- attendance breakdown (all time) ---
    status_counts = dict(
        db.execute(
            select(AttendanceRecord.status, func.count(AttendanceRecord.id)).group_by(
                AttendanceRecord.status
            )
        ).all()
    )
    recorded = sum(status_counts.values())
    attended = sum(status_counts.get(s, 0) for s in PRESENT_STATUSES)
    breakdown = AttendanceSummary(
        present=status_counts.get("present", 0),
        late=status_counts.get("late", 0),
        excused=status_counts.get("excused", 0),
        absent=status_counts.get("absent", 0),
        total=recorded,
        rate=rate(attended, recorded),
    )

    # --- enrollments per department ---
    by_department = [
        CountPoint(label=department, value=count)
        for department, count in db.execute(
            select(Course.department, func.count(Enrollment.id))
            .join(Enrollment, Enrollment.course_id == Course.id)
            .group_by(Course.department)
            .order_by(func.count(Enrollment.id).desc())
        ).all()
    ]

    # --- letter-grade distribution over graded enrollments ---
    buckets = dict.fromkeys(GRADE_BUCKETS, 0)
    for (score,) in db.execute(select(Enrollment.score).where(Enrollment.score.is_not(None))).all():
        letter = letter_grade(score)
        if letter is not None:
            buckets[letter] += 1
    grade_distribution = [CountPoint(label=letter, value=buckets[letter]) for letter in GRADE_BUCKETS]

    # --- headcount per grade level ---
    by_grade_level = [
        CountPoint(label=f"Grade {level}", value=count)
        for level, count in db.execute(
            select(Student.grade_level, func.count(Student.id))
            .group_by(Student.grade_level)
            .order_by(Student.grade_level)
        ).all()
    ]

    # --- daily attendance rate, most recent `trend_days` recorded days ---
    daily = db.execute(
        select(
            AttendanceRecord.day,
            func.count(AttendanceRecord.id),
            func.sum(case((AttendanceRecord.status.in_(PRESENT_STATUSES), 1), else_=0)),
        )
        .group_by(AttendanceRecord.day)
        .order_by(AttendanceRecord.day.desc())
        .limit(trend_days)
    ).all()

    attendance_trend = [
        TrendPoint(day=day, rate=rate(day_attended, day_recorded) or 0.0, recorded=day_recorded)
        for day, day_recorded, day_attended in reversed(daily)
    ]

    return DashboardStats(
        summary=StatsSummary(
            total_students=total_students,
            active_students=active_students,
            total_courses=total_courses,
            total_enrollments=total_enrollments,
            average_score=round(average_score, 1) if average_score is not None else None,
            attendance_rate=breakdown.rate,
        ),
        by_department=by_department,
        grade_distribution=grade_distribution,
        by_grade_level=by_grade_level,
        attendance_trend=attendance_trend,
        attendance_breakdown=breakdown,
    )
