#!/usr/bin/env python3
"""
Migration script to move data from SQLite to PostgreSQL
"""
import sqlite3
import psycopg2
from pathlib import Path

# SQLite database path
SQLITE_DB = Path(__file__).parents[1] / "backend" / "data" / "expenseai.sqlite3"

# PostgreSQL connection details
PG_CONFIG = {
    'host': 'localhost',
    'database': 'expenseai',
    'user': 'expenseai',
    'password': 'expenseai_secure_password_2024',
    'port': 5432
}

def migrate():
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Connect to SQLite
    print(f"Connecting to SQLite: {SQLITE_DB}")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    
    # Connect to PostgreSQL
    print("Connecting to PostgreSQL...")
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_cur = pg_conn.cursor()
    
    try:
        # Create tables in PostgreSQL
        print("Creating tables in PostgreSQL...")
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                notes TEXT,
                ai_suggested INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        
        pg_cur.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        
        pg_cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_expenses_user_date
                ON expenses(user_id, date DESC, created_at DESC);
        """)
        
        pg_conn.commit()
        print("Tables created successfully")
        
        # Migrate users
        print("Migrating users...")
        sqlite_cur = sqlite_conn.cursor()
        users = sqlite_cur.execute("SELECT * FROM users").fetchall()
        
        for user in users:
            pg_cur.execute(
                """
                INSERT INTO users (id, email, password_hash, password_salt, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (email) DO NOTHING
                """,
                (user['id'], user['email'], user['password_hash'], user['password_salt'], user['created_at'])
            )
        pg_conn.commit()
        print(f"Migrated {len(users)} users")
        
        # Migrate sessions
        print("Migrating sessions...")
        sessions = sqlite_cur.execute("SELECT * FROM sessions").fetchall()
        
        for session in sessions:
            pg_cur.execute(
                """
                INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (token_hash) DO NOTHING
                """,
                (session['token_hash'], session['user_id'], session['created_at'], session['expires_at'])
            )
        pg_conn.commit()
        print(f"Migrated {len(sessions)} sessions")
        
        # Migrate expenses
        print("Migrating expenses...")
        expenses = sqlite_cur.execute("SELECT * FROM expenses").fetchall()
        
        for expense in expenses:
            pg_cur.execute(
                """
                INSERT INTO expenses (id, user_id, description, amount, category, date, notes, ai_suggested, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    expense['id'],
                    expense['user_id'],
                    expense['description'],
                    expense['amount'],
                    expense['category'],
                    expense['date'],
                    expense['notes'],
                    expense['ai_suggested'],
                    expense['created_at'],
                    expense['updated_at']
                )
            )
        pg_conn.commit()
        print(f"Migrated {len(expenses)} expenses")
        
        # Migrate password reset tokens
        print("Migrating password reset tokens...")
        tokens = sqlite_cur.execute("SELECT * FROM password_reset_tokens").fetchall()
        
        for token in tokens:
            pg_cur.execute(
                """
                INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (token_hash) DO NOTHING
                """,
                (token['token_hash'], token['user_id'], token['created_at'], token['expires_at'])
            )
        pg_conn.commit()
        print(f"Migrated {len(tokens)} password reset tokens")
        
        print("\n✅ Migration completed successfully!")
        print(f"Total users: {len(users)}")
        print(f"Total sessions: {len(sessions)}")
        print(f"Total expenses: {len(expenses)}")
        print(f"Total password reset tokens: {len(tokens)}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        pg_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        pg_cur.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
