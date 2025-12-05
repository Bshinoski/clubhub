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

    - photos(photo_id TEXT PK, group_id INTEGER,
             url TEXT, thumbnail_url TEXT,
             caption TEXT, uploaded_by TEXT,
             uploaded_at TEXT)
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

            c.execute(
                """
                CREATE TABLE IF NOT EXISTS photos (
                    photo_id TEXT PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    url TEXT NOT NULL,
                    thumbnail_url TEXT,
                    caption TEXT,
                    uploaded_by TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL
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

    def get_group_member_count(self, group_id: int) -> int:
        """
        Get total number of members in a group.
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM group_members
                WHERE group_id = ?
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

    def get_user_balance(self, user_id: str, group_id: int) -> float:
        """
        Return the current balance for a user in a given group.
        """
        with self._conn() as conn:
            cur = conn.execute(
                """
                SELECT balance
                FROM group_members
                WHERE user_id = ? AND group_id = ?
                """,
                (user_id, group_id),
            )
            row = cur.fetchone()
            if not row:
                return 0.0
            return float(row["balance"])

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

    def create_event(self, event_data: Dict[str, Any]) -> None:
        """
        Insert a new event.

        Expected keys in event_data (as built in api/events.py):
        - event_id
        - group_id
        - title
        - description (optional)
        - event_date (YYYY-MM-DD)
        - event_time (HH:MM)
        - location (optional)
        - event_type
        - created_by
        - created_at
        """
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO events
                    (event_id, group_id, title, description, event_date,
                     event_time, location, event_type, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_data["event_id"],
                    event_data["group_id"],
                    event_data["title"],
                    event_data.get("description"),
                    event_data["event_date"],
                    event_data["event_time"],
                    event_data.get("location"),
                    event_data["event_type"],
                    event_data["created_by"],
                    event_data["created_at"],
                ),
            )

    def get_event_by_id(self, event_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    # Backwards-compatible alias if anything still calls get_event
    def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        return self.get_event_by_id(event_id)

    def get_group_events(
        self,
        group_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Return events for a group, optionally filtered by date range, type, and limit.

        Dates are stored as 'YYYY-MM-DD' text, so string comparisons work for
        >= / <= and ordering.
        """
        query = """
            SELECT * FROM events
            WHERE group_id = ?
        """
        params: List[Any] = [group_id]

        if start_date:
            query += " AND event_date >= ?"
            params.append(start_date)

        if end_date:
            query += " AND event_date <= ?"
            params.append(end_date)

        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)

        query += " ORDER BY event_date, event_time"

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        with self._conn() as conn:
            cur = conn.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def update_event(self, event_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        if not updates:
            return self.get_event_by_id(event_id) or {}
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
        return self.get_event_by_id(event_id) or {}

    def delete_event(self, event_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM events WHERE event_id = ?", (event_id,))

    # ============= PAYMENT OPERATIONS =============

    def create_payment(self, payment_data: dict) -> None:
        """
        Insert a new payment row and update the member's running balance.

        Expected keys in payment_data:
            payment_id, group_id, user_id, amount, description,
            payment_type ('CHARGE' or 'CREDIT'),
            status,                 # usually 'PENDING' on create
            due_date (or None),
            created_by, created_at  # ISO strings
            optional: paid_date
        """
        payment_id = payment_data["payment_id"]
        group_id = payment_data["group_id"]
        user_id = payment_data["user_id"]
        amount = float(payment_data["amount"])
        description = payment_data["description"]
        payment_type = payment_data["payment_type"]
        status = payment_data["status"]
        due_date = payment_data.get("due_date")
        paid_date = payment_data.get("paid_date")          # usually None on create
        created_by = payment_data["created_by"]
        created_at = payment_data["created_at"]

        # Get user's name for the payment record
        user = self.get_user_by_id(user_id)
        user_name = user.get("display_name", user["email"]) if user else "Unknown"

        # INSERT that matches your payments table (includes user_name)
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO payments (
                    payment_id,
                    group_id,
                    user_id,
                    user_name,
                    amount,
                    description,
                    payment_type,
                    status,
                    due_date,
                    paid_date,
                    created_by,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payment_id,
                    group_id,
                    user_id,
                    user_name,
                    amount,
                    description,
                    payment_type,
                    status,
                    due_date,
                    paid_date,
                    created_by,
                    created_at,
                ),
            )

        # Adjust member balance based on payment_type
        # Positive balance = member owes money
        # Negative balance = member has credit
        # CHARGE  -> member owes more  -> balance goes UP (add amount)
        # CREDIT  -> member owes less  -> balance goes DOWN (subtract amount)
        if payment_type == "CHARGE":
            self.update_member_balance(user_id, group_id, amount)
        elif payment_type == "CREDIT":
            self.update_member_balance(user_id, group_id, -amount)

    def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM payments WHERE payment_id = ?", (payment_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_payment_by_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """
        Small wrapper to match the old interface used by the payments API.
        """
        return self.get_payment(payment_id)

    def get_group_payments(
        self,
        group_id: int,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Return payments for a group, optionally filtered by user_id and status.

        This matches the usage in the payments API, which passes user_id and/or
        status as keyword arguments.
        """
        query = """
            SELECT * FROM payments
            WHERE group_id = ?
        """
        params: List[Any] = [group_id]

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)

        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC"

        with self._conn() as conn:
            cur = conn.execute(query, tuple(params))
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

    def delete_payment(self, payment_id: str) -> None:
        """
        Delete a payment and reverse its balance adjustment.

        When deleting a payment, we reverse the balance change:
        - CHARGE payments increased balance, so we decrease it back
        - CREDIT payments decreased balance, so we increase it back
        """
        # First get the payment details so we can reverse the balance
        payment = self.get_payment(payment_id)
        if not payment:
            return

        user_id = payment["user_id"]
        group_id = payment["group_id"]
        amount = float(payment["amount"])
        payment_type = payment["payment_type"]

        # Delete the payment
        with self._conn() as conn:
            conn.execute("DELETE FROM payments WHERE payment_id = ?", (payment_id,))

        # Reverse the balance adjustment
        if payment_type == "CHARGE":
            # CHARGE increased balance, so subtract it back
            self.update_member_balance(user_id, group_id, -amount)
        elif payment_type == "CREDIT":
            # CREDIT decreased balance, so add it back
            self.update_member_balance(user_id, group_id, amount)

    # ============= MESSAGE OPERATIONS =============

    def create_message(self, message_data_or_group_id, user_id: str = None, user_name: str = None, content: str = None) -> Dict[str, Any]:
        """
        Create a message. Accepts either:
        - A dict with message_id, group_id, user_id, content, created_at
        - Individual parameters (group_id, user_id, user_name, content)
        """
        if isinstance(message_data_or_group_id, dict):
            # Dict format from chat API
            message_data = message_data_or_group_id
            message_id = message_data['message_id']
            group_id = message_data['group_id']
            user_id = message_data['user_id']
            content = message_data['content']
            created_at = message_data.get('created_at', datetime.utcnow().isoformat())

            # Get user_name from database if not in message_data
            user = self.get_user_by_id(user_id)
            user_name = user.get('display_name', user['email']) if user else 'Unknown'
        else:
            # Individual parameters format (legacy)
            message_id = str(uuid.uuid4())
            group_id = message_data_or_group_id
            created_at = datetime.utcnow().isoformat()

        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO messages
                    (message_id, group_id, user_id, user_name, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (message_id, group_id, user_id, user_name, content, created_at),
            )

        return self.get_message(message_id)

    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM messages WHERE message_id = ?", (message_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Alias for get_message for API compatibility"""
        return self.get_message(message_id)

    def get_group_messages(self, group_id: int, limit: int = 50, before: str = None) -> List[Dict[str, Any]]:
        """Get messages for a group, optionally paginated with before cursor"""
        with self._conn() as conn:
            if before:
                cur = conn.execute(
                    """
                    SELECT * FROM messages
                    WHERE group_id = ? AND created_at < ?
                    ORDER BY created_at DESC
                    LIMIT ?
                    """,
                    (group_id, before, limit),
                )
            else:
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

    def delete_message(self, message_id: str) -> bool:
        """Delete a message by ID"""
        with self._conn() as conn:
            cursor = conn.execute(
                "DELETE FROM messages WHERE message_id = ?",
                (message_id,)
            )
            return cursor.rowcount > 0

    # ============= PHOTO OPERATIONS =============

    def create_photo(self, photo_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a new photo.

        Expected keys in photo_data:
        - photo_id (str)
        - group_id (int)
        - url (str)
        - thumbnail_url (str, optional)
        - caption (str, optional)
        - uploaded_by (str, user_id)
        - uploaded_at (str, ISO timestamp)
        """
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO photos
                    (photo_id, group_id, url, thumbnail_url, caption, uploaded_by, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    photo_data["photo_id"],
                    photo_data["group_id"],
                    photo_data["url"],
                    photo_data.get("thumbnail_url"),
                    photo_data.get("caption"),
                    photo_data["uploaded_by"],
                    photo_data["uploaded_at"],
                ),
            )
        return self.get_photo_by_id(photo_data["photo_id"])

    def get_photo_by_id(self, photo_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single photo by its ID.
        """
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT * FROM photos WHERE photo_id = ?", (photo_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def get_group_photos(
        self,
        group_id: int,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get all photos for a group, with optional pagination.

        Args:
            group_id: The group ID to fetch photos for
            limit: Maximum number of photos to return
            offset: Number of photos to skip

        Returns:
            List of photo dictionaries, ordered by upload time (newest first)
        """
        query = """
            SELECT * FROM photos
            WHERE group_id = ?
            ORDER BY uploaded_at DESC
        """
        params: List[Any] = [group_id]

        if limit is not None:
            query += " LIMIT ?"
            params.append(limit)

        if offset is not None:
            query += " OFFSET ?"
            params.append(offset)

        with self._conn() as conn:
            cur = conn.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def update_photo(self, photo_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a photo's metadata (e.g., caption).

        Args:
            photo_id: The photo ID to update
            updates: Dictionary of fields to update (e.g., {"caption": "New caption"})

        Returns:
            Updated photo dictionary
        """
        if not updates:
            return self.get_photo_by_id(photo_id) or {}

        fields = []
        values: List[Any] = []
        for k, v in updates.items():
            fields.append(f"{k} = ?")
            values.append(v)
        values.append(photo_id)

        with self._conn() as conn:
            conn.execute(
                f"UPDATE photos SET {', '.join(fields)} WHERE photo_id = ?",
                tuple(values),
            )

        return self.get_photo_by_id(photo_id) or {}

    def delete_photo(self, photo_id: str) -> None:
        """
        Delete a photo from the database.

        Args:
            photo_id: The photo ID to delete
        """
        with self._conn() as conn:
            conn.execute("DELETE FROM photos WHERE photo_id = ?", (photo_id,))

    def get_group_photo_count(self, group_id: int) -> int:
        """
        Get the total count of photos for a group.

        Args:
            group_id: The group ID

        Returns:
            Total number of photos in the group
        """
        with self._conn() as conn:
            cur = conn.execute(
                "SELECT COUNT(*) AS cnt FROM photos WHERE group_id = ?",
                (group_id,),
            )
            row = cur.fetchone()
            return int(row["cnt"]) if row else 0


_db_service: Optional[LocalDBService] = None


def get_db_service():
    """
    Get the database service instance (singleton pattern).
    Returns DynamoDBService if USE_DYNAMODB is True, otherwise LocalDBService.
    """
    global _db_service
    if _db_service is None:
        # Check if we should use DynamoDB
        use_dynamodb = getattr(settings, "USE_DYNAMODB", False)
        if use_dynamodb:
            from app.services.dynamodb_service import DynamoDBService
            _db_service = DynamoDBService()
            print("🗄️  Using DynamoDB for persistent storage")
        else:
            _db_service = LocalDBService()
            print("🗄️  Using SQLite for local storage")
    return _db_service
