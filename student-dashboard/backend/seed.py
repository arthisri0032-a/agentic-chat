"""Populate the database with a realistic sample school.

Run once after installing dependencies:

    python seed.py            # only seeds when the database is empty
    python seed.py --reset    # drops every table first, then reseeds
"""

import argparse
import random
from datetime import date, timedelta

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.models import AttendanceRecord, Course, Enrollment, Student

SEED = 20260917
SCHOOL_DAYS = 40
DOMAIN = "northgate.edu"

FIRST_NAMES = [
    "Amara", "Ravi", "Noor", "Elena", "Tomas", "Aisha", "Kai", "Mila", "Diego", "Hana",
    "Yusuf", "Freya", "Omar", "Ingrid", "Mateo", "Zara", "Luca", "Priya", "Ethan", "Sofia",
    "Nadia", "Jonas", "Leila", "Andre", "Keiko", "Marcus", "Ines", "Tobias", "Rania", "Felix",
    "Clara", "Idris", "Maya", "Oscar", "Salma", "Victor", "Nina", "Hugo", "Lena", "Samir",
]

LAST_NAMES = [
    "Okafor", "Nakamura", "Silva", "Haddad", "Petrov", "Lindqvist", "Mensah", "Rossi",
    "Kowalski", "Fernandes", "Bergstrom", "Diallo", "Moreau", "Vasquez", "Ibrahim", "Novak",
    "Andersson", "Chowdhury", "Castillo", "Weber", "Tanaka", "Marchetti", "Osei", "Reyes",
]

COURSES = [
    ("MATH201", "Linear Algebra", "Mathematics", "Dr. Pauline Vance", 4),
    ("MATH140", "Statistics I", "Mathematics", "Dr. Pauline Vance", 3),
    ("PHYS110", "Classical Mechanics", "Science", "Dr. Amin Farouk", 4),
    ("BIO150", "Cell Biology", "Science", "Dr. Grace Whitfield", 4),
    ("CHEM120", "Organic Chemistry", "Science", "Dr. Grace Whitfield", 4),
    ("CS101", "Intro to Programming", "Computer Science", "Prof. Dana Oyelaran", 3),
    ("CS210", "Data Structures", "Computer Science", "Prof. Dana Oyelaran", 4),
    ("ENG105", "World Literature", "Humanities", "Ms. Harriet Cole", 3),
    ("HIST130", "Modern History", "Humanities", "Mr. Lars Bergman", 3),
    ("ART100", "Studio Drawing", "Arts", "Ms. Yuki Sato", 2),
    ("MUS110", "Music Theory", "Arts", "Ms. Yuki Sato", 2),
    ("PE100", "Physical Education", "Athletics", "Coach Rui Almeida", 1),
]

# Weighted so most marks are "present" — an absence-heavy school would skew every chart.
ATTENDANCE_STATUSES = ["present", "present", "present", "present", "present", "late", "excused", "absent"]


def school_days(count: int, end: date) -> list[date]:
    """The `count` most recent weekdays ending on or before `end`, oldest first."""
    days: list[date] = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return list(reversed(days))


def build_students(rng: random.Random, today: date) -> list[Student]:
    students: list[Student] = []
    used_emails: set[str] = set()

    for _ in range(140):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)

        base = f"{first}.{last}".lower()
        email = f"{base}@{DOMAIN}"
        suffix = 2
        while email in used_emails:
            email = f"{base}{suffix}@{DOMAIN}"
            suffix += 1
        used_emails.add(email)

        grade_level = rng.choice([9, 9, 10, 10, 10, 11, 11, 12])
        status = rng.choices(["active", "inactive", "graduated"], weights=[88, 6, 6])[0]
        age = 14 + (grade_level - 9) + rng.randint(0, 1)

        students.append(
            Student(
                first_name=first,
                last_name=last,
                email=email,
                phone=f"+1-555-{rng.randint(1000, 9999)}",
                date_of_birth=date(today.year - age, rng.randint(1, 12), rng.randint(1, 28)),
                grade_level=grade_level,
                status=status,
                enrolled_on=today - timedelta(days=rng.randint(30, 1200)),
            )
        )
    return students


def build_enrollments(rng: random.Random, students, courses, today: date) -> list[Enrollment]:
    enrollments: list[Enrollment] = []

    for student in students:
        # Each student has a stable aptitude, so their scores correlate across courses
        # instead of being uniform noise — that makes the grade charts look like a school.
        aptitude = rng.gauss(78, 9)

        for course in rng.sample(courses, rng.randint(3, 6)):
            score = None
            if rng.random() < 0.88:  # the rest are enrolled but not yet graded
                score = max(35.0, min(100.0, rng.gauss(aptitude, 7)))
                score = round(score, 1)

            enrollments.append(
                Enrollment(
                    student=student,
                    course=course,
                    score=score,
                    enrolled_on=today - timedelta(days=rng.randint(10, 200)),
                )
            )
    return enrollments


def build_attendance(rng: random.Random, students, today: date) -> list[AttendanceRecord]:
    records: list[AttendanceRecord] = []
    enrolled = [s for s in students if s.status == "active"]

    for day in school_days(SCHOOL_DAYS, today):
        for student in enrolled:
            if rng.random() < 0.04:  # a few students simply have no mark for the day
                continue
            records.append(
                AttendanceRecord(student=student, day=day, status=rng.choice(ATTENDANCE_STATUSES))
            )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="Drop all tables before seeding.")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    rng = random.Random(SEED)
    today = date.today()

    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Student)):
            print("Database already has students — nothing seeded. Use --reset to rebuild it.")
            return

        courses = [
            Course(code=code, name=name, department=department, instructor=instructor, credits=credits)
            for code, name, department, instructor, credits in COURSES
        ]
        students = build_students(rng, today)

        db.add_all(courses)
        db.add_all(students)
        db.flush()  # assign primary keys before the relationship rows reference them

        enrollments = build_enrollments(rng, students, courses, today)
        attendance = build_attendance(rng, students, today)
        db.add_all(enrollments)
        db.add_all(attendance)
        db.commit()

        print(
            f"Seeded {len(students)} students, {len(courses)} courses, "
            f"{len(enrollments)} enrollments, {len(attendance)} attendance records."
        )


if __name__ == "__main__":
    main()
