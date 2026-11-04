from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, Enrollment
from app.schemas import CourseCreate, CourseListItem, CourseRead, CourseUpdate

router = APIRouter(prefix="/api/courses", tags=["courses"])


def _get_or_404(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(404, f"Course {course_id} not found.")
    return course


@router.get("", response_model=list[CourseListItem])
def list_courses(db: Session = Depends(get_db), department: str | None = None):
    enrollments = (
        select(
            Enrollment.course_id.label("course_id"),
            func.count(Enrollment.id).label("enrolled_count"),
            func.avg(Enrollment.score).label("average_score"),
        )
        .group_by(Enrollment.course_id)
        .subquery()
    )

    stmt = (
        select(
            Course,
            func.coalesce(enrollments.c.enrolled_count, 0),
            enrollments.c.average_score,
        )
        .outerjoin(enrollments, enrollments.c.course_id == Course.id)
        .order_by(Course.code)
    )
    if department:
        stmt = stmt.where(Course.department == department)

    return [
        CourseListItem(
            **CourseRead.model_validate(course).model_dump(),
            enrolled_count=enrolled_count,
            average_score=round(average_score, 1) if average_score is not None else None,
        )
        for course, enrolled_count, average_score in db.execute(stmt).all()
    ]


@router.get("/departments", response_model=list[str])
def list_departments(db: Session = Depends(get_db)):
    return list(db.scalars(select(Course.department).distinct().order_by(Course.department)).all())


@router.post("", response_model=CourseRead, status_code=201)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = Course(**payload.model_dump())
    course.code = course.code.upper()
    db.add(course)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"Course code {course.code} is already in use.") from exc
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseRead)
def get_course(course_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, course_id)


@router.put("/{course_id}", response_model=CourseRead)
def update_course(course_id: int, payload: CourseUpdate, db: Session = Depends(get_db)):
    course = _get_or_404(db, course_id)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("code"):
        updates["code"] = updates["code"].upper()

    for field, value in updates.items():
        setattr(course, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Another course already uses that code.") from exc
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = _get_or_404(db, course_id)
    db.delete(course)
    db.commit()
