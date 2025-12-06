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



To deploy:
AWS Amplify automatically does frontend when there are updates
For backend save changes on main, then do sam build and sam deploy
