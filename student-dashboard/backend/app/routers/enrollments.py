from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, Enrollment, Student
from app.schemas import EnrollmentCreate, EnrollmentRead, EnrollmentUpdate

router = APIRouter(prefix="/api/enrollments", tags=["enrollments"])


def _read_model(enrollment: Enrollment, course: Course) -> EnrollmentRead:
    return EnrollmentRead(
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


@router.post("", response_model=EnrollmentRead, status_code=201)
def create_enrollment(payload: EnrollmentCreate, db: Session = Depends(get_db)):
    if db.get(Student, payload.student_id) is None:
        raise HTTPException(404, f"Student {payload.student_id} not found.")

    course = db.get(Course, payload.course_id)
    if course is None:
        raise HTTPException(404, f"Course {payload.course_id} not found.")

    enrollment = Enrollment(**payload.model_dump(), enrolled_on=date.today())
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "That student is already enrolled in this course.") from exc
    db.refresh(enrollment)
    return _read_model(enrollment, course)


@router.put("/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment(enrollment_id: int, payload: EnrollmentUpdate, db: Session = Depends(get_db)):
    row = db.execute(
        select(Enrollment, Course)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Enrollment.id == enrollment_id)
    ).first()
    if row is None:
        raise HTTPException(404, f"Enrollment {enrollment_id} not found.")

    enrollment, course = row
    enrollment.score = payload.score
    db.commit()
    db.refresh(enrollment)
    return _read_model(enrollment, course)


@router.delete("/{enrollment_id}", status_code=204)
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enrollment = db.get(Enrollment, enrollment_id)
    if enrollment is None:
        raise HTTPException(404, f"Enrollment {enrollment_id} not found.")
    db.delete(enrollment)
    db.commit()
