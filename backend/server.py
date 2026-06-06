from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import smtplib
import sys
import traceback
import uuid
from datetime import UTC, datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

try:
    import psycopg2
    import psycopg2.extras
    USE_POSTGRES = True
except ImportError:
    USE_POSTGRES = False


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "backend" / "data" / "expenseai.sqlite3"
DEFAULT_PG_CONFIG = {
    'host': os.environ.get('PGHOST', 'localhost'),
    'database': os.environ.get('PGDATABASE', 'expenseai'),
    'user': os.environ.get('PGUSER', 'expenseai'),
    'password': os.environ.get('PGPASSWORD', 'expenseai_secure_password_2024'),
    'port': int(os.environ.get('PGPORT', '5432'))
}
EMAIL_CONFIG = {
    'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
    'smtp_port': int(os.environ.get('SMTP_PORT', '587')),
    'email': os.environ.get('EMAIL_ADDRESS', ''),
    'password': os.environ.get('EMAIL_PASSWORD', ''),
    'use_tls': os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true',
    'use_ssl': os.environ.get('EMAIL_USE_SSL', 'false').lower() == 'true',
    'from_name': os.environ.get('EMAIL_FROM_NAME', 'ExpenseAI'),
}
SESSION_DAYS = 30
RESET_HOURS = 1
SMTP_TIMEOUT_SECONDS = 15
MAX_JSON_BYTES = 1024 * 1024
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_smtp_config() -> dict[str, Any]:
    """Load SMTP configuration from file"""
    config_file = Path.home() / "Library" / "Application Support" / "ExpenseAI" / "smtp_config.json"
    if config_file.exists():
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_smtp_config(config: dict[str, Any]) -> None:
    """Save SMTP configuration to file"""
    config_dir = Path.home() / "Library" / "Application Support" / "ExpenseAI"
    config_dir.mkdir(parents=True, exist_ok=True)
    config_file = config_dir / "smtp_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f)

def get_email_config() -> dict[str, Any]:
    """Get email configuration from file or environment variables"""
    smtp_config = load_smtp_config()
    
    if smtp_config.get('email') and smtp_config.get('password'):
        return {
            'smtp_server': smtp_config.get('server', 'smtp.gmail.com'),
            'smtp_port': int(smtp_config.get('port', '587')),
            'email': smtp_config['email'],
            'password': smtp_config['password'],
            'use_tls': smtp_config.get('use_tls', True),
            'use_ssl': smtp_config.get('use_ssl', False),
            'from_name': 'ExpenseAI',
        }
    
    # Fallback to environment variables
    return EMAIL_CONFIG


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def generate_reset_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def normalize_reset_code(code: str) -> str:
    return code.strip().replace(" ", "").replace("-", "")


def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP email to user"""
    email_config = get_email_config()
    if not email_config['email'] or not email_config['password']:
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'ExpenseAI password reset code'
        msg['From'] = f"{email_config['from_name']} <{email_config['email']}>"
        msg['To'] = to_email

        text_content = f"""ExpenseAI password reset

Your password reset code is: {otp}

This code expires in {RESET_HOURS * 60} minutes. If you did not request this reset, you can ignore this email.
"""
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                <h1 style="color: white; margin: 0;">ExpenseAI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Password Reset Request</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
                <p style="color: #333; font-size: 16px;">You requested a password reset for your ExpenseAI account.</p>
                <p style="color: #333; font-size: 16px;">Your password reset code is:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #667eea;">
                    <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">{otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This code will expire in {RESET_HOURS * 60} minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>This is an automated email from ExpenseAI. Please do not reply.</p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        if email_config['use_ssl']:
            server = smtplib.SMTP_SSL(
                email_config['smtp_server'],
                email_config['smtp_port'],
                timeout=SMTP_TIMEOUT_SECONDS,
            )
        else:
            server = smtplib.SMTP(
                email_config['smtp_server'],
                email_config['smtp_port'],
                timeout=SMTP_TIMEOUT_SECONDS,
            )

        with server:
            if email_config['use_tls'] and not email_config['use_ssl']:
                server.starttls()
            server.login(email_config['email'], email_config['password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


def add_days(days: int) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).isoformat(timespec="seconds")


def add_hours(hours: int) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat(timespec="seconds")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or base64.b64encode(secrets.token_bytes(16)).decode("ascii")
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    )
    return base64.b64encode(digest).decode("ascii"), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, stored_hash)


def user_payload(row: Any) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "createdAt": row["created_at"],
    }


def expense_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "description": row["description"],
        "amount": float(row["amount"]),
        "category": row["category"],
        "date": row["date"],
        "notes": row["notes"] or None,
        "aiSuggested": bool(row["ai_suggested"]),
    }


def income_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "description": row["description"],
        "amount": float(row["amount"]),
        "category": row["category"],
        "date": row["date"],
        "notes": row["notes"] or None,
    }


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class Database:
    def __init__(self, path: Path | dict[str, Any] | None = None):
        self.use_postgres = USE_POSTGRES
        if self.use_postgres:
            self.pg_config = DEFAULT_PG_CONFIG if isinstance(path, dict) or path is None else DEFAULT_PG_CONFIG
        else:
            self.path = path if isinstance(path, Path) else DEFAULT_DB
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self.init()

    def connect(self):
        if self.use_postgres:
            conn = psycopg2.connect(**self.pg_config)
            conn.autocommit = False
            return conn
        else:
            import sqlite3
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            return conn

    def init(self) -> None:
        if self.use_postgres:
            with self.connect() as conn:
                cur = conn.cursor()
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        email TEXT NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        password_salt TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        token_hash TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS expenses (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        notes TEXT,
                        tax REAL,
                        ai_suggested INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        token_hash TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS income (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        notes TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_expenses_user_date
                        ON expenses(user_id, date DESC, created_at DESC);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_income_user_date
                        ON income(user_id, date DESC, created_at DESC);
                """)
                conn.commit()
        else:
            import sqlite3
            with self.connect() as conn:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                        password_hash TEXT NOT NULL,
                        password_salt TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS sessions (
                        token_hash TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS expenses (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        notes TEXT,
                        tax REAL,
                        ai_suggested INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS password_reset_tokens (
                        token_hash TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        created_at TEXT NOT NULL,
                        expires_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS income (
                        id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        category TEXT NOT NULL,
                        date TEXT NOT NULL,
                        notes TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );

                    CREATE INDEX IF NOT EXISTS idx_expenses_user_date
                        ON expenses(user_id, date DESC, created_at DESC);
                    CREATE INDEX IF NOT EXISTS idx_income_user_date
                        ON income(user_id, date DESC, created_at DESC);
                    """
                )


class ExpenseAIHandler(BaseHTTPRequestHandler):
    server_version = "ExpenseAIBackend/1.0"
    db: Database
    static_dir: Path | None

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        self.dispatch()

    def do_POST(self) -> None:
        self.dispatch()

    def do_PUT(self) -> None:
        self.dispatch()

    def do_DELETE(self) -> None:
        self.dispatch()

    def dispatch(self) -> None:
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            if path.startswith("/api/"):
                self.handle_api(path)
            else:
                self.handle_static(path)
        except ApiError as exc:
            self.send_json({"error": exc.message}, exc.status)
        except Exception:
            traceback.print_exc()
            self.send_json({"error": "Internal server error"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def send_cors_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")

    def send_json(self, body: Any, status: int = HTTPStatus.OK) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self) -> dict[str, Any]:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except ValueError:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Invalid request body length")

        if length <= 0:
            return {}
        if length > MAX_JSON_BYTES:
            raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body is too large")

        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be valid JSON")

        if not isinstance(data, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be a JSON object")
        return data

    def require_user(self) -> Any:
        header = self.headers.get("Authorization", "")
        prefix = "Bearer "
        if not header.startswith(prefix):
            raise ApiError(HTTPStatus.UNAUTHORIZED, "Please sign in first")

        token = header[len(prefix) :].strip()
        if not token:
            raise ApiError(HTTPStatus.UNAUTHORIZED, "Please sign in first")

        token_hash = hash_token(token)
        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute("DELETE FROM sessions WHERE expires_at < %s", (now_iso(),))
                cur.execute(
                    """
                    SELECT users.*
                    FROM sessions
                    JOIN users ON users.id = sessions.user_id
                    WHERE sessions.token_hash = %s AND sessions.expires_at >= %s
                    """,
                    (token_hash, now_iso()),
                )
                row = cur.fetchone()
                conn.commit()
            else:
                conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now_iso(),))
                row = conn.execute(
                    """
                    SELECT users.*
                    FROM sessions
                    JOIN users ON users.id = sessions.user_id
                    WHERE sessions.token_hash = ? AND sessions.expires_at >= ?
                    """,
                    (token_hash, now_iso()),
                ).fetchone()

        if row is None:
            raise ApiError(HTTPStatus.UNAUTHORIZED, "Session expired. Please sign in again.")
        return row

    def create_session(self, conn, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        if self.db.use_postgres:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (%s, %s, %s, %s)",
                (hash_token(token), user_id, now_iso(), add_days(SESSION_DAYS)),
            )
        else:
            conn.execute(
                "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (hash_token(token), user_id, now_iso(), add_days(SESSION_DAYS)),
            )
        return token

    def handle_api(self, path: str) -> None:
        if self.command == "GET" and path == "/api/health":
            db_info = "PostgreSQL" if self.db.use_postgres else f"SQLite: {self.db.path}"
            self.send_json({"ok": True, "database": db_info})
            return

        if self.command == "POST" and path == "/api/auth/register":
            self.handle_register()
            return

        if self.command == "POST" and path == "/api/auth/login":
            self.handle_login()
            return

        if self.command == "GET" and path == "/api/auth/me":
            user = self.require_user()
            self.send_json({"user": user_payload(user)})
            return

        if self.command == "POST" and path == "/api/auth/logout":
            self.handle_logout()
            return

        if self.command == "POST" and path == "/api/auth/forgot-password":
            self.handle_forgot_password()
            return

        if self.command == "POST" and path == "/api/auth/reset-password":
            self.handle_reset_password()
            return

        if self.command == "POST" and path == "/api/config/smtp":
            self.handle_save_smtp_config()
            return

        if path == "/api/expenses":
            if self.command == "GET":
                self.handle_list_expenses()
                return
            if self.command == "POST":
                self.handle_create_expense()
                return

        match = re.fullmatch(r"/api/expenses/([^/]+)", path)
        if match:
            expense_id = unquote(match.group(1))
            if self.command == "PUT":
                self.handle_update_expense(expense_id)
                return
            if self.command == "DELETE":
                self.handle_delete_expense(expense_id)
                return

        if path == "/api/income":
            if self.command == "GET":
                self.handle_list_income()
                return
            if self.command == "POST":
                self.handle_create_income()
                return

        match = re.fullmatch(r"/api/income/([^/]+)", path)
        if match:
            income_id = unquote(match.group(1))
            if self.command == "PUT":
                self.handle_update_income(income_id)
                return
            if self.command == "DELETE":
                self.handle_delete_income(income_id)
                return

        raise ApiError(HTTPStatus.NOT_FOUND, "API route not found")

    def handle_register(self) -> None:
        data = self.read_json()
        email, password = self.clean_credentials(data)
        password_hash, salt = hash_password(password)

        try:
            with self.db.connect() as conn:
                if self.db.use_postgres:
                    cur = conn.cursor()
                    cur.execute(
                        """
                        INSERT INTO users (email, password_hash, password_salt, created_at)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                        """,
                        (email, password_hash, salt, now_iso()),
                    )
                    user_id = cur.fetchone()[0]
                    token = self.create_session(conn, user_id)
                    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                    user = cur.fetchone()
                    conn.commit()
                else:
                    cursor = conn.execute(
                        """
                        INSERT INTO users (email, password_hash, password_salt, created_at)
                        VALUES (?, ?, ?, ?)
                        """,
                        (email, password_hash, salt, now_iso()),
                    )
                    user_id = int(cursor.lastrowid)
                    token = self.create_session(conn, user_id)
                    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        except (psycopg2.IntegrityError if self.db.use_postgres else sqlite3.IntegrityError) as e:
            # Check if the email actually exists in the database
            with self.db.connect() as conn:
                if self.db.use_postgres:
                    cur = conn.cursor()
                    cur.execute("SELECT email FROM users WHERE email = %s", (email,))
                    existing_user = cur.fetchone()
                else:
                    existing_user = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
                
                if existing_user:
                    raise ApiError(HTTPStatus.CONFLICT, "An account already exists with this email")
                else:
                    # This might be a database corruption or lock issue
                    raise ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, f"Database error: {str(e)}. Please try again or clear the database.")

        self.send_json({"user": user_payload(user), "token": token}, HTTPStatus.CREATED)

    def handle_login(self) -> None:
        data = self.read_json()
        email, password = self.clean_credentials(data)

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute("SELECT * FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                if user is None or not verify_password(password, user["password_hash"], user["password_salt"]):
                    raise ApiError(HTTPStatus.UNAUTHORIZED, "Invalid email or password")
                token = self.create_session(conn, int(user["id"]))
                conn.commit()
            else:
                user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
                if user is None or not verify_password(password, user["password_hash"], user["password_salt"]):
                    raise ApiError(HTTPStatus.UNAUTHORIZED, "Invalid email or password")
                token = self.create_session(conn, int(user["id"]))

        self.send_json({"user": user_payload(user), "token": token})

    def handle_logout(self) -> None:
        header = self.headers.get("Authorization", "")
        token = header.removeprefix("Bearer ").strip()
        if token:
            with self.db.connect() as conn:
                if self.db.use_postgres:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM sessions WHERE token_hash = %s", (hash_token(token),))
                    conn.commit()
                else:
                    conn.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))
        self.send_json({"ok": True})

    def clean_email(self, data: dict[str, Any]) -> str:
        email = str(data.get("email", "")).strip().lower()
        if not EMAIL_RE.match(email):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Please enter a valid email address")
        return email

    def handle_forgot_password(self) -> None:
        email = self.clean_email(self.read_json())
        
        # Check if email is configured
        email_enabled = bool(EMAIL_CONFIG['email'] and EMAIL_CONFIG['password'])
        
        response: dict[str, Any] = {
            "message": "If an account exists for this email, a password reset OTP has been sent to your email address.",
            "emailEnabled": email_enabled
        }

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor()
                cur.execute("DELETE FROM password_reset_tokens WHERE expires_at < %s", (now_iso(),))
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                user = cur.fetchone()
                if user is None:
                    self.send_json(response)
                    return

                user_id = int(user[0])
                cur.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,))
                reset_token = generate_reset_code()
                cur.execute(
                    """
                    INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (hash_token(reset_token), user_id, now_iso(), add_hours(RESET_HOURS)),
                )
                conn.commit()
            else:
                conn.execute("DELETE FROM password_reset_tokens WHERE expires_at < ?", (now_iso(),))
                user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if user is None:
                    self.send_json(response)
                    return

                user_id = int(user["id"])
                conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
                reset_token = generate_reset_code()
                conn.execute(
                    """
                    INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (hash_token(reset_token), user_id, now_iso(), add_hours(RESET_HOURS)),
                )

        # Always include reset code in response for fallback
        response["resetCode"] = reset_token
        response["expiresInMinutes"] = RESET_HOURS * 60

        # Send email if configured
        if email_enabled:
            email_sent = send_otp_email(email, reset_token)
            if not email_sent:
                response["message"] = "Email sending failed. Use the reset code below to reset your password."
                response["emailSent"] = False
            else:
                response["message"] = "Password reset OTP sent to your email. You can also use the code below as a backup."
                response["emailSent"] = True
        else:
            response["message"] = "Email not configured. Use the reset code below to reset your password."
            response["emailSent"] = False

        self.send_json(response)

    def handle_reset_password(self) -> None:
        data = self.read_json()
        reset_token = normalize_reset_code(str(data.get("token", "")))
        password = str(data.get("password", ""))

        if not reset_token:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Reset code is required")
        if len(password) < 6:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Password must be at least 6 characters")

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor()
                cur.execute("DELETE FROM password_reset_tokens WHERE expires_at < %s", (now_iso(),))
                cur.execute(
                    """
                    SELECT user_id
                    FROM password_reset_tokens
                    WHERE token_hash = %s AND expires_at >= %s
                    """,
                    (hash_token(reset_token), now_iso()),
                )
                row = cur.fetchone()
                if row is None:
                    raise ApiError(HTTPStatus.BAD_REQUEST, "Invalid or expired reset code. Request a new one.")

                user_id = int(row[0])
                password_hash, salt = hash_password(password)
                cur.execute(
                    "UPDATE users SET password_hash = %s, password_salt = %s WHERE id = %s",
                    (password_hash, salt, user_id),
                )
                cur.execute("DELETE FROM password_reset_tokens WHERE user_id = %s", (user_id,))
                cur.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
                session_token = self.create_session(conn, user_id)
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                conn.commit()
            else:
                conn.execute("DELETE FROM password_reset_tokens WHERE expires_at < ?", (now_iso(),))
                row = conn.execute(
                    """
                    SELECT user_id
                    FROM password_reset_tokens
                    WHERE token_hash = ? AND expires_at >= ?
                    """,
                    (hash_token(reset_token), now_iso()),
                ).fetchone()
                if row is None:
                    raise ApiError(HTTPStatus.BAD_REQUEST, "Invalid or expired reset code. Request a new one.")

                user_id = int(row["user_id"])
                password_hash, salt = hash_password(password)
                conn.execute(
                    "UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?",
                    (password_hash, salt, user_id),
                )
                conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
                conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
                session_token = self.create_session(conn, user_id)
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

        self.send_json({"user": user_payload(user), "token": session_token})

    def handle_save_smtp_config(self) -> None:
        data = self.read_json()
        smtp_config = {
            'server': str(data.get('server', 'smtp.gmail.com')),
            'port': str(data.get('port', '587')),
            'email': str(data.get('email', '')),
            'password': str(data.get('password', '')),
            'use_tls': bool(data.get('use_tls', True)),
            'use_ssl': bool(data.get('use_ssl', False)),
        }
        save_smtp_config(smtp_config)
        self.send_json({"ok": True, "message": "SMTP configuration saved successfully"})

    def clean_credentials(self, data: dict[str, Any]) -> tuple[str, str]:
        email = self.clean_email(data)
        password = str(data.get("password", ""))
        if len(password) < 6:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Password must be at least 6 characters")
        return email, password

    def handle_list_expenses(self) -> None:
        user = self.require_user()
        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    SELECT *
                    FROM expenses
                    WHERE user_id = %s
                    ORDER BY date DESC, created_at DESC
                    """,
                    (user["id"],),
                )
                rows = cur.fetchall()
                conn.commit()
            else:
                rows = conn.execute(
                    """
                    SELECT *
                    FROM expenses
                    WHERE user_id = ?
                    ORDER BY date DESC, created_at DESC
                    """,
                    (user["id"],),
                ).fetchall()
        self.send_json({"expenses": [expense_payload(row) for row in rows]})

    def clean_expense(self, data: dict[str, Any]) -> dict[str, Any]:
        description = str(data.get("description", "")).strip()
        category = str(data.get("category", "")).strip() or "Other"
        date = str(data.get("date", "")).strip()
        notes_value = data.get("notes")
        notes = str(notes_value).strip() if notes_value not in (None, "") else None
        ai_suggested = bool(data.get("aiSuggested", False))

        try:
            amount = float(data.get("amount"))
        except (TypeError, ValueError):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Amount must be a valid number")

        if not description:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Description is required")
        if amount <= 0:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Amount must be greater than zero")
        if not DATE_RE.match(date):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Date must use YYYY-MM-DD format")
        if len(category) > 80:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Category is too long")
        if notes is not None and len(notes) > 700:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Notes must be 700 characters or fewer")

        return {
            "description": description,
            "amount": amount,
            "category": category,
            "date": date,
            "notes": notes,
            "ai_suggested": 1 if ai_suggested else 0,
        }

    def handle_create_expense(self) -> None:
        user = self.require_user()
        expense = self.clean_expense(self.read_json())
        expense_id = uuid.uuid4().hex
        timestamp = now_iso()

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    INSERT INTO expenses (
                        id, user_id, description, amount, category, date, notes,
                        ai_suggested, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        expense_id,
                        user["id"],
                        expense["description"],
                        expense["amount"],
                        expense["category"],
                        expense["date"],
                        expense["notes"],
                        expense["ai_suggested"],
                        timestamp,
                        timestamp,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
            else:
                conn.execute(
                    """
                    INSERT INTO expenses (
                        id, user_id, description, amount, category, date, notes,
                        ai_suggested, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        expense_id,
                        user["id"],
                        expense["description"],
                        expense["amount"],
                        expense["category"],
                        expense["date"],
                        expense["notes"],
                        expense["ai_suggested"],
                        timestamp,
                        timestamp,
                    ),
                )
                row = conn.execute(
                    "SELECT * FROM expenses WHERE id = ? AND user_id = ?",
                    (expense_id, user["id"]),
                ).fetchone()

        self.send_json({"expense": expense_payload(row)}, HTTPStatus.CREATED)

    def handle_update_expense(self, expense_id: str) -> None:
        user = self.require_user()
        expense = self.clean_expense(self.read_json())

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    UPDATE expenses
                    SET description = %s, amount = %s, category = %s, date = %s, notes = %s,
                        ai_suggested = %s, updated_at = %s
                    WHERE id = %s AND user_id = %s
                    RETURNING *
                    """,
                    (
                        expense["description"],
                        expense["amount"],
                        expense["category"],
                        expense["date"],
                        expense["notes"],
                        expense["ai_suggested"],
                        now_iso(),
                        expense_id,
                        user["id"],
                    ),
                )
                row = cur.fetchone()
                if row is None:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Expense not found")
                conn.commit()
            else:
                cursor = conn.execute(
                    """
                    UPDATE expenses
                    SET description = ?, amount = ?, category = ?, date = ?, notes = ?,
                        ai_suggested = ?, updated_at = ?
                    WHERE id = ? AND user_id = ?
                    """,
                    (
                        expense["description"],
                        expense["amount"],
                        expense["category"],
                        expense["date"],
                        expense["notes"],
                        expense["ai_suggested"],
                        now_iso(),
                        expense_id,
                        user["id"],
                    ),
                )
                if cursor.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Expense not found")
                row = conn.execute(
                    "SELECT * FROM expenses WHERE id = ? AND user_id = ?",
                    (expense_id, user["id"]),
                ).fetchone()

        self.send_json({"expense": expense_payload(row)})

    def handle_delete_expense(self, expense_id: str) -> None:
        user = self.require_user()
        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM expenses WHERE id = %s AND user_id = %s",
                    (expense_id, user["id"]),
                )
                if cur.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Expense not found")
                conn.commit()
            else:
                cursor = conn.execute(
                    "DELETE FROM expenses WHERE id = ? AND user_id = ?",
                    (expense_id, user["id"]),
                )
                if cursor.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Expense not found")
        self.send_json({"ok": True})

    def handle_list_income(self) -> None:
        user = self.require_user()
        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    SELECT *
                    FROM income
                    WHERE user_id = %s
                    ORDER BY date DESC, created_at DESC
                    """,
                    (user["id"],),
                )
                rows = cur.fetchall()
                conn.commit()
            else:
                rows = conn.execute(
                    """
                    SELECT *
                    FROM income
                    WHERE user_id = ?
                    ORDER BY date DESC, created_at DESC
                    """,
                    (user["id"],),
                ).fetchall()
        self.send_json({"income": [income_payload(row) for row in rows]})

    def clean_income(self, data: dict[str, Any]) -> dict[str, Any]:
        description = str(data.get("description", "")).strip()
        category = str(data.get("category", "")).strip() or "Other"
        date = str(data.get("date", "")).strip()
        notes_value = data.get("notes")
        notes = str(notes_value).strip() if notes_value not in (None, "") else None

        try:
            amount = float(data.get("amount"))
        except (TypeError, ValueError):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Amount must be a valid number")

        if not description:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Description is required")
        if amount <= 0:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Amount must be greater than zero")
        if not DATE_RE.match(date):
            raise ApiError(HTTPStatus.BAD_REQUEST, "Date must use YYYY-MM-DD format")
        if len(category) > 80:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Category is too long")
        if notes is not None and len(notes) > 700:
            raise ApiError(HTTPStatus.BAD_REQUEST, "Notes must be 700 characters or fewer")

        return {
            "description": description,
            "amount": amount,
            "category": category,
            "date": date,
            "notes": notes,
        }

    def handle_create_income(self) -> None:
        user = self.require_user()
        income = self.clean_income(self.read_json())
        income_id = uuid.uuid4().hex
        timestamp = now_iso()

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    INSERT INTO income (
                        id, user_id, description, amount, category, date, notes,
                        created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        income_id,
                        user["id"],
                        income["description"],
                        income["amount"],
                        income["category"],
                        income["date"],
                        income["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
            else:
                conn.execute(
                    """
                    INSERT INTO income (
                        id, user_id, description, amount, category, date, notes,
                        created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        income_id,
                        user["id"],
                        income["description"],
                        income["amount"],
                        income["category"],
                        income["date"],
                        income["notes"],
                        timestamp,
                        timestamp,
                    ),
                )
                row = conn.execute(
                    "SELECT * FROM income WHERE id = ? AND user_id = ?",
                    (income_id, user["id"]),
                ).fetchone()

        self.send_json({"income": income_payload(row)})

    def handle_update_income(self, income_id: str) -> None:
        user = self.require_user()
        income = self.clean_income(self.read_json())

        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    """
                    UPDATE income
                    SET description = %s, amount = %s, category = %s, date = %s, notes = %s,
                        updated_at = %s
                    WHERE id = %s AND user_id = %s
                    RETURNING *
                    """,
                    (
                        income["description"],
                        income["amount"],
                        income["category"],
                        income["date"],
                        income["notes"],
                        now_iso(),
                        income_id,
                        user["id"],
                    ),
                )
                row = cur.fetchone()
                if row is None:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Income not found")
                conn.commit()
            else:
                cursor = conn.execute(
                    """
                    UPDATE income
                    SET description = ?, amount = ?, category = ?, date = ?, notes = ?,
                        updated_at = ?
                    WHERE id = ? AND user_id = ?
                    """,
                    (
                        income["description"],
                        income["amount"],
                        income["category"],
                        income["date"],
                        income["notes"],
                        now_iso(),
                        income_id,
                        user["id"],
                    ),
                )
                if cursor.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Income not found")
                row = conn.execute(
                    "SELECT * FROM income WHERE id = ? AND user_id = ?",
                    (income_id, user["id"]),
                ).fetchone()

        self.send_json({"income": income_payload(row)})

    def handle_delete_income(self, income_id: str) -> None:
        user = self.require_user()
        with self.db.connect() as conn:
            if self.db.use_postgres:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM income WHERE id = %s AND user_id = %s",
                    (income_id, user["id"]),
                )
                if cur.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Income not found")
                conn.commit()
            else:
                cursor = conn.execute(
                    "DELETE FROM income WHERE id = ? AND user_id = ?",
                    (income_id, user["id"]),
                )
                if cursor.rowcount == 0:
                    raise ApiError(HTTPStatus.NOT_FOUND, "Income not found")
        self.send_json({"ok": True})

    def handle_static(self, path: str) -> None:
        if self.static_dir is None:
            raise ApiError(HTTPStatus.NOT_FOUND, "Static file serving is not enabled")

        safe_path = unquote(path.split("?", 1)[0])
        relative = safe_path.lstrip("/") or "index.html"
        file_path = (self.static_dir / relative).resolve()

        if not str(file_path).startswith(str(self.static_dir.resolve())):
            raise ApiError(HTTPStatus.NOT_FOUND, "File not found")

        if file_path.is_dir():
            file_path = file_path / "index.html"
        if not file_path.exists() or not file_path.is_file():
            file_path = self.static_dir / "index.html"

        if not file_path.exists():
            raise ApiError(HTTPStatus.NOT_FOUND, "File not found")

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def create_handler(db: Database, static_dir: Path | None) -> type[ExpenseAIHandler]:
    class ConfiguredExpenseAIHandler(ExpenseAIHandler):
        pass

    ConfiguredExpenseAIHandler.db = db
    ConfiguredExpenseAIHandler.static_dir = static_dir
    return ConfiguredExpenseAIHandler


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ExpenseAI backend API and static server")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8787")))
    parser.add_argument(
        "--use-postgres",
        action="store_true",
        help="Use PostgreSQL instead of SQLite",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=Path(os.environ.get("EXPENSEAI_DB_PATH", DEFAULT_DB)),
        help="Path to the SQLite database file",
    )
    parser.add_argument(
        "--pg-host",
        default=os.environ.get("PGHOST", "localhost"),
        help="PostgreSQL host",
    )
    parser.add_argument(
        "--pg-database",
        default=os.environ.get("PGDATABASE", "expenseai"),
        help="PostgreSQL database name",
    )
    parser.add_argument(
        "--pg-user",
        default=os.environ.get("PGUSER", "expenseai"),
        help="PostgreSQL user",
    )
    parser.add_argument(
        "--pg-password",
        default=os.environ.get("PGPASSWORD", "expenseai_secure_password_2024"),
        help="PostgreSQL password",
    )
    parser.add_argument(
        "--pg-port",
        type=int,
        default=int(os.environ.get("PGPORT", "5432")),
        help="PostgreSQL port",
    )
    parser.add_argument(
        "--static-dir",
        type=Path,
        default=Path(os.environ["EXPENSEAI_STATIC_DIR"]) if "EXPENSEAI_STATIC_DIR" in os.environ else None,
        help="Optional built frontend directory to serve",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    
    # Override USE_POSTGRES if --use-postgres flag is provided
    global USE_POSTGRES
    if args.use_postgres and USE_POSTGRES:
        USE_POSTGRES = True
    elif args.use_postgres and not USE_POSTGRES:
        print("Warning: --use-postgres flag provided but psycopg2 is not installed. Using SQLite instead.", flush=True)
        USE_POSTGRES = False
    
    if USE_POSTGRES:
        pg_config = {
            'host': args.pg_host,
            'database': args.pg_database,
            'user': args.pg_user,
            'password': args.pg_password,
            'port': args.pg_port
        }
        db = Database(pg_config)
        db_info = f"PostgreSQL: {pg_config['database']}@{pg_config['host']}:{pg_config['port']}"
    else:
        db = Database(args.db.resolve())
        db_info = f"SQLite: {db.path}"
    
    static_dir = args.static_dir.resolve() if args.static_dir else None
    server = ThreadingHTTPServer((args.host, args.port), create_handler(db, static_dir))
    print(f"ExpenseAI backend running at http://{args.host}:{args.port}", flush=True)
    print(f"Database: {db_info}", flush=True)
    if static_dir:
        print(f"Serving frontend: {static_dir}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
