"""Reusable aggregate subqueries shared by the student and stats routers."""

from sqlalchemy import Subquery, case, func, select

from app.models import AttendanceRecord, Enrollment

# Statuses that count as "the student showed up" when computing an attendance rate.
PRESENT_STATUSES = ("present", "late")


def enrollment_aggregate() -> Subquery:
    """Per-student course count and mean score (ungraded enrollments are ignored by AVG)."""
    return (
        select(
            Enrollment.student_id.label("student_id"),
            func.count(Enrollment.id).label("courses_count"),
            func.avg(Enrollment.score).label("average_score"),
        )
        .group_by(Enrollment.student_id)
        .subquery()
    )


def attendance_aggregate() -> Subquery:
    """Per-student attendance totals plus the number of days counted as attended."""
    attended = func.sum(
        case((AttendanceRecord.status.in_(PRESENT_STATUSES), 1), else_=0)
    ).label("attended")

    return (
        select(
            AttendanceRecord.student_id.label("student_id"),
            func.count(AttendanceRecord.id).label("recorded"),
            attended,
        )
        .group_by(AttendanceRecord.student_id)
        .subquery()
    )


def rate(attended: float | None, recorded: float | None) -> float | None:
    """Percentage, rounded to one decimal. None when there is nothing to divide by."""
    if not recorded:
        return None
    return round((attended or 0) / recorded * 100, 1)


def letter_grade(score: float | None) -> str | None:
    if score is None:
        return None
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"
