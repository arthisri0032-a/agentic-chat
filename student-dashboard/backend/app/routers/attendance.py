from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceRecord, Student
from app.schemas import AttendanceRead, AttendanceUpsert

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _upsert(db: Session, payload: AttendanceUpsert) -> AttendanceRecord:
    """Attendance is unique per (student, day), so a repeat mark edits the existing row."""
    if db.get(Student, payload.student_id) is None:
        raise HTTPException(404, f"Student {payload.student_id} not found.")

    record = db.scalar(
        select(AttendanceRecord).where(
            AttendanceRecord.student_id == payload.student_id,
            AttendanceRecord.day == payload.day,
        )
    )
    if record is None:
        record = AttendanceRecord(**payload.model_dump())
        db.add(record)
    else:
        record.status = payload.status
    return record


@router.get("", response_model=list[AttendanceRead])
def list_attendance(
    db: Session = Depends(get_db),
    day: date | None = None,
    student_id: int | None = None,
    limit: int = Query(default=500, ge=1, le=5000),
):
    stmt = select(AttendanceRecord).order_by(AttendanceRecord.day.desc(), AttendanceRecord.id)
    if day is not None:
        stmt = stmt.where(AttendanceRecord.day == day)
    if student_id is not None:
        stmt = stmt.where(AttendanceRecord.student_id == student_id)
    return list(db.scalars(stmt.limit(limit)).all())


@router.post("", response_model=AttendanceRead)
def mark_attendance(payload: AttendanceUpsert, db: Session = Depends(get_db)):
    record = _upsert(db, payload)
    db.commit()
    db.refresh(record)
    return record


@router.post("/bulk")
def mark_attendance_bulk(payloads: list[AttendanceUpsert], db: Session = Depends(get_db)):
    for payload in payloads:
        _upsert(db, payload)
    db.commit()
    return {"status": "ok", "upserted": len(payloads)}
