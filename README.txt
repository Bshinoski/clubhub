READ ME

# ClubHub MVP

Full-stack club/team management platform.

### Stack
- **Frontend:** React + TypeScript (Vite)
- **Backend:** FastAPI + SQLite
- **Auth:** Simple username/password with group create/join
- **Deployment Target:** AWS Lambda + DynamoDB (future)

### Local Setup
```bash
# Backend
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
