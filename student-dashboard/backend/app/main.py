from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import attendance, courses, enrollments, stats, students

app = FastAPI(title="Student Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(students.router)
app.include_router(courses.router)
app.include_router(enrollments.router)
app.include_router(attendance.router)
app.include_router(stats.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
