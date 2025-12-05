import sqlite3
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import shortuuid

from app.config import settings


def _parse_db_url(url: str) -> str:
    """
    Very small helper: accepts things like
    - sqlite:///./clubhub.db
    - sqlite:///clubhub.db
    and returns the filesystem path.
    """
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "", 1)
    return url


class LocalDBService:
    """
    Simple SQLite-backed service replacing DynamoDB.

    Tables:

    - users(user_id TEXT PK, email TEXT UNIQUE, display_name TEXT,
            phone TEXT, password_hash TEXT, created_at TEXT)

    - groups(group_id INTEGER PK AUTOINCREMENT, name TEXT,
             description TEXT, invite_code TEXT UNIQUE,
             created_by TEXT, created_at TEXT)

    - group_members(group_id INTEGER, user_id TEXT,
                    role TEXT, joined_at TEXT,
                    status TEXT, balance REAL,
                    PRIMARY KEY(group_id, user_id))

    - events(event_id TEXT PK, group_id INTEGER,
             title TEXT, description TEXT,
             event_date TEXT, event_time TEXT,
             location TEXT, event_type TEXT,
             created_by TEXT, created_at TEXT)

    - payments(payment_id TEXT PK, group_id INTEGER,
               user_id TEXT, user_name TEXT,
               amount REAL, description TEXT,
               payment_type TEXT, status TEXT,
               due_date TEXT, paid_date TEXT,
               created_by TEXT, created_at TEXT)

    - messages(message_id TEXT PK, group_id INTEGER,
               user_id TEXT, user_name TEXT,
               content TEXT, created_at TEXT)
    """

    def __init__(self) -> None:
        db_url = getattr(settings, "DATABASE_URL", "sqlite:///./clubhub.db")
        self.db_path = _parse_db_url(db_url)
        self._init_db()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            c = conn.cursor()

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    display_name TEXT,
                    phone TEXT,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS groups (
                    group_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    invite_code TEXT UNIQUE,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS group_members (
                    group_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    joined_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    balance REAL NOT NULL DEFAULT 0,
                    PRIMARY KEY (group_id, user_id)
                )
                """
            )

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    event_date TEXT NOT NULL,
                    event_time TEXT NOT NULL,
                    location TEXT,
                    event_type TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS payments (
                    payment_id TEXT PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    description TEXT NOT NULL,
                    payment_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    due_date TEXT,
                    paid_date TEXT,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    message_id TEXT PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    # ============= USER OPERATIONS =============

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected keys in user_data (matching auth/frontend):
        - user_id (string, uuid)
        - email
        - display_name
        - password_hash
        - phone (optional)
        - created_at
        """
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO users (user_id, email, display_name, phone, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    user_data["user_id"],
                    user_data["email"],
                    user_data.get("display_name"),
                    user_data.get("phone"),
                    user_data["password_hash"],
                    user_data["created_at"],
                ),
            )
        return user_data

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Used by members.py to edit display_name / phone, etc.
        """
        if not updates:
            return self.get_user_by_id(user_id) or {}

        fields = []
        values: List[Any] = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(user_id)

        with self._conn() as conn:
            conn.execute(
                f"UPDATE users SET {', '.join(fields)} WHERE user_id = ?",
                tuple(values),
            )

        return self.get_user_by_id(user_id) or {}

    # ============= GROUP OPERATIONS =============

    def create_group(self, group_data: Dict[str, Any]) -> int:
        """
        Expected keys:
        - name
        - description (optional)
        - created_by (user_id string)
        - created_at
        (invite_code will be generated separately)
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                INSERT INTO groups (name, description, created_by, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    group_data["name"],
                    group_data.get("description"),
                    group_data["created_by"],
                    group_data["created_at"],
                ),
            )
            group_id = cur.lastrowid
        return group_id

    def generate_group_invite_code(self, group_id: int) -> str:
        invite_code = shortuuid.ShortUUID().random(length=6).upper()
        with self._conn() as conn:
            conn.execute(
                "UPDATE groups SET invite_code = ? WHERE group_id = ?",
                (invite_code, group_id),
            )
        return invite_code

    def get_group_by_invite_code(self, invite_code: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM groups WHERE invite_code = ?", (invite_code,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_by_id(self, group_id: int) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute("SELECT * FROM groups WHERE group_id = ?", (group_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def update_group(self, group_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        if not updates:
            g = self.get_group_by_id(group_id)
            return g or {}

        fields = []
        values: List[Any] = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(group_id)

        with self._conn() as conn:
            conn.execute(
                f"UPDATE groups SET {', '.join(fields)} WHERE group_id = ?",
                tuple(values),
            )

        return self.get_group_by_id(group_id) or {}

    # ============= MEMBERSHIP OPERATIONS =============

    def add_group_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Expected keys:
        - group_id (int)
        - user_id (str)
        - role ('admin' | 'member')
        - joined_at
        - status (e.g. 'ACTIVE')
        - balance (float, usually 0)
        """
        with self._conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO group_members
                    (group_id, user_id, role, joined_at, status, balance)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    member_data["group_id"],
                    member_data["user_id"],
                    member_data["role"],
                    member_data["joined_at"],
                    member_data.get("status", "ACTIVE"),
                    member_data.get("balance", 0.0),
                ),
            )
        return member_data

    def get_user_membership(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Returns the first membership for this user (for now we assume
        a user belongs to a single active group).
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT gm.*, g.name AS group_name
                FROM group_members gm
                JOIN groups g ON g.group_id = gm.group_id
                WHERE gm.user_id = ?
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_members(self, group_id: int) -> List[Dict[str, Any]]:
        """
        Used by members.py:get_group_members.
        Returns membership rows plus user info.
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT gm.*, u.email, u.display_name, u.phone
                FROM group_members gm
                JOIN users u ON u.user_id = gm.user_id
                WHERE gm.group_id = ?
                """,
                (group_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def get_group_admin_count(self, group_id: int) -> int:
        """
        Used to prevent demoting/removing the last admin.
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM group_members
                WHERE group_id = ? AND role = 'admin'
                """,
                (group_id,),
            )
            row = cur.fetchone()
            return int(row["cnt"]) if row else 0

    def update_member_role(self, group_id: int, user_id: str, role: str) -> Dict[str, Any]:
        """
        Signature matches members.py:
            db.update_member_role(group_id, member_id, request.role)
        """
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE group_members
                SET role = ?
                WHERE group_id = ? AND user_id = ?
                """,
                (role, group_id, user_id),
            )
        mem = self.get_user_membership(user_id)
        return mem or {}

    def update_member_balance(self, user_id: str, group_id: int, amount: float) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                UPDATE group_members
                SET balance = balance + ?
                WHERE user_id = ? AND group_id = ?
                """,
                (amount, user_id, group_id),
            )

    def remove_member(self, user_id: str, group_id: int) -> None:
        with self._conn() as conn:
            conn.execute(
                "DELETE FROM group_members WHERE user_id = ? AND group_id = ?",
                (user_id, group_id),
            )

    def remove_group_member(self, group_id: int, user_id: str) -> None:
        """
        Wrapper to match members.py:
            db.remove_group_member(group_id, member_id)
        """
        self.remove_member(user_id, group_id)

    # ============= EVENT OPERATIONS =============

    def create_event(self, group_id: int, user_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        event_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO events
                    (event_id, group_id, title, description, event_date,
                     event_time, location, event_type, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    group_id,
                    event_data["title"],
                    event_data.get("description"),
                    event_data["event_date"],
                    event_data["event_time"],
                    event_data.get("location"),
                    event_data["event_type"],
                    user_id,
                    now,
                ),
            )

        return self.get_event(event_id)

    def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_events(self, group_id: int) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM events WHERE group_id = ? ORDER BY event_date, event_time",
                (group_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def update_event(self, event_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        if not updates:
            return self.get_event(event_id) or {}
        fields = []
        values: List[Any] = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(event_id)
        with self._conn() as conn:
            conn.execute(
                f"UPDATE events SET {', '.join(fields)} WHERE event_id = ?",
                tuple(values),
            )
        return self.get_event(event_id) or {}

    def delete_event(self, event_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM events WHERE event_id = ?", (event_id,))

    # ============= PAYMENT OPERATIONS =============

    def create_payment(self, group_id: int, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        payment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO payments
                    (payment_id, group_id, user_id, user_name, amount, description,
                     payment_type, status, due_date, paid_date,
                     created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payment_id,
                    group_id,
                    payment_data["user_id"],
                    payment_data["user_name"],
                    payment_data["amount"],
                    payment_data["description"],
                    payment_data["payment_type"],
                    payment_data["status"],
                    payment_data.get("due_date"),
                    payment_data.get("paid_date"),
                    payment_data["created_by"],
                    now,
                ),
            )

        # adjust balance
        amount = payment_data["amount"]
        if payment_data["payment_type"] == "CHARGE":
            self.update_member_balance(payment_data["user_id"], group_id, -amount)
        elif payment_data["payment_type"] == "CREDIT":
            self.update_member_balance(payment_data["user_id"], group_id, amount)

        return self.get_payment(payment_id)

    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM payments WHERE payment_id = ?", (payment_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_payments(self, group_id: int) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM payments WHERE group_id = ? ORDER BY created_at DESC",
                (group_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def get_user_payments(self, user_id: str) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def update_payment(self, payment_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        if not updates:
            return self.get_payment(payment_id) or {}

        fields = []
        values: List[Any] = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(payment_id)

        with self._conn() as conn:
            conn.execute(
                f"UPDATE payments SET {', '.join(fields)} WHERE payment_id = ?",
                tuple(values),
            )

        return self.get_payment(payment_id) or {}

    # ============= MESSAGE OPERATIONS =============

    def create_message(self, group_id: int, user_id: str, user_name: str, content: str) -> Dict[str, Any]:
        message_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO messages
                    (message_id, group_id, user_id, user_name, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (message_id, group_id, user_id, user_name, content, now),
            )

        return self.get_message(message_id)

    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM messages WHERE message_id = ?", (message_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_messages(self, group_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT * FROM messages
                WHERE group_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (group_id, limit),
            )
            rows = cur.fetchall()
            # oldest first for the frontend
            return [dict(r) for r in reversed(rows)]


_db_service: Optional[LocalDBService] = None


def get_db_service() -> LocalDBService:
    global _db_service
    if _db_service is None:
        _db_service = LocalDBService()
    return _db_service
