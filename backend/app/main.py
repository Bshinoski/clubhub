from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings

# Import API routers
from app.api import auth, groups, members, events, payments, photos, chat

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ClubApp API - Team Management Platform",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for local photo storage
if settings.USE_LOCAL_STORAGE:
    uploads_dir = Path(settings.LOCAL_STORAGE_PATH)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Health check endpoint
@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(members.router, prefix="/api/members", tags=["Members"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(photos.router, prefix="/api/photos", tags=["Photos"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# Startup event
@app.on_event("startup")
async def startup_event():
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting up...")
    print(f"📊 Database: SQLite (local)")
    if settings.USE_LOCAL_STORAGE:
        print(f"📸 Photo Storage: Local ({settings.LOCAL_STORAGE_PATH})")
    else:
        print(f"📸 Photo Storage: AWS S3 ({settings.S3_BUCKET_NAME})")
    print(f"🔐 Auth: JWT (local)")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    print(f"👋 {settings.APP_NAME} shutting down...")

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)