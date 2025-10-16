from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3, os, secrets
from datetime import datetime, timezone

DB_PATH = os.environ.get("DB_PATH", "clubapp_local.db")

# ---------- DB ----------
def get_conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with get_conn() as c:
        # users now includes role ('admin'|'member')
        c.execute("""
        CREATE TABLE IF NOT EXISTS users (
          username    TEXT PRIMARY KEY,
          password    TEXT NOT NULL,
          displayName TEXT,
          groupId     INTEGER,
          role        TEXT NOT NULL DEFAULT 'member',  -- NEW
          createdAt   TEXT NOT NULL
        );
        """)
        # add role if DB already existed without it
        cols = [r["name"] for r in c.execute("PRAGMA table_info(users);")]
        if "role" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'")

        c.execute("""
        CREATE TABLE IF NOT EXISTS groups (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          name      TEXT NOT NULL,
          code      TEXT NOT NULL UNIQUE,
          createdAt TEXT NOT NULL
        );
        """)


# ---------- API ----------
app = FastAPI(title="ClubApp Local Auth (PLAINTEXT DEV)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

class SignupIn(BaseModel):
    username: str
    password: str
    displayName: str | None = None
    # Exactly one of these must be provided:
    groupName: str | None = None   # create a new group with this name
    inviteCode: str | None = None  # OR join an existing group via code

class LoginIn(BaseModel):
    username: str
    password: str

@app.on_event("startup")
async def _startup():
    init_db()

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat()}

def _make_code() -> str:
    # short readable-ish code
    return secrets.token_urlsafe(5)

@app.post("/signup")
def signup(body: SignupIn):
    username = body.username.strip().lower()
    if not username or not body.password:
        raise HTTPException(400, "username and password required")

    creating = bool(body.groupName and not body.inviteCode)
    joining  = bool(body.inviteCode and not body.groupName)
    if not (creating ^ joining):
        raise HTTPException(400, "provide either groupName (create) OR inviteCode (join)")

    with get_conn() as c:
        # ensure user doesn't exist
        if c.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
            raise HTTPException(409, "username already exists")

        group_id = None
        created_code = None
        role = "member"

        if creating:
            # create a new group
            role = "admin"
            created_code = _make_code()
            c.execute(
                "INSERT INTO groups (name, code, createdAt) VALUES (?, ?, ?)",
                (body.groupName.strip(), created_code, datetime.now(timezone.utc).isoformat()),
            )
            group_id = c.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        else:  # joining
            g = c.execute("SELECT id FROM groups WHERE code = ?", (body.inviteCode.strip(),)).fetchone()
            if not g:
                raise HTTPException(404, "invalid invite code")
            group_id = g["id"]

        # create user and attach to groupId
        c.execute(
            "INSERT INTO users (username, password, displayName, groupId, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            (username, body.password, body.displayName or username, group_id, role,
             datetime.now(timezone.utc).isoformat()),
        )

    # if we created a group, return its join code so the UI can show it
    return {"ok": True, "userId": username, "groupId": group_id, "role": role, "groupCode": group_code}

@app.post("/login")
def login(body: LoginIn):
    username = body.username.strip().lower()
    if not username or not body.password:
        raise HTTPException(400, "username and password required")
    with get_conn() as c:
        row = c.execute(
            "SELECT username, password, displayName, groupId, role FROM users WHERE username=?",
            (username,)
        ).fetchone()
        if not row or body.password != row["password"]:
            raise HTTPException(401, "invalid credentials")
        return {
            "ok": True,
            "userId": row["username"],
            "displayName": row["displayName"],
            "groupId": row["groupId"],
            "role": row["role"],
        }
