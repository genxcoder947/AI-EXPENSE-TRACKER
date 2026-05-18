from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reports" / "ExpenseAI_Project_Summary.pdf"

NAVY = colors.HexColor("#0B2545")
BLUE = colors.HexColor("#2E74B5")
DARK_BLUE = colors.HexColor("#1F4D78")
MUTED = colors.HexColor("#536478")
INK = colors.HexColor("#162131")
GRID = colors.HexColor("#CBD5E1")
LIGHT_BLUE = colors.HexColor("#E8EEF5")
LIGHT_GRAY = colors.HexColor("#F4F6F9")
PALE_GREEN = colors.HexColor("#ECFDF5")
PALE_YELLOW = colors.HexColor("#FFF7ED")


def text(value: str) -> str:
    return escape(value).replace("\n", "<br/>")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=BLUE, spaceAfter=5))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=30, leading=35, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=12.5, leading=17, textColor=MUTED, spaceAfter=16))
styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.8, leading=13.2, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=BLUE, spaceBefore=14, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name="H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=DARK_BLUE, spaceBefore=9, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="TableHead", parent=styles["Body"], fontName="Helvetica-Bold", fontSize=8.2, leading=10.3, textColor=NAVY, spaceAfter=0))
styles.add(ParagraphStyle(name="TableCell", parent=styles["Body"], fontSize=8.1, leading=10.3, spaceAfter=0))


def p(s: str, style: str = "Body") -> Paragraph:
    return Paragraph(text(s), styles[style])


def rich(s: str, style: str = "Body") -> Paragraph:
    return Paragraph(s, styles[style])


def bullet_items(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="bullet",
        leftIndent=13,
        bulletFontSize=6,
        bulletColor=BLUE,
    )


def numbered_items(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=10) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=8,
        bulletColor=BLUE,
    )


def cell(value: str, style: str = "TableCell") -> Paragraph:
    return p(value, style)


def make_table(headers: list[str], rows: list[tuple[str, ...]], widths: list[float], fill=LIGHT_BLUE) -> Table:
    data = [[cell(h, "TableHead") for h in headers]]
    for row in rows:
        data.append([cell(str(v)) for v in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), fill),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def callout(label: str, body: str, fill=LIGHT_GRAY) -> Table:
    content = [rich(f"<b>{text(label)}</b>", "Body"), p(body)]
    t = Table([[content]], colWidths=[6.2 * inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill),
        ("BOX", (0, 0), (-1, -1), 0.5, GRID),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8DEE9"))
    canvas.setLineWidth(0.4)
    canvas.line(doc.leftMargin, 0.58 * inch, doc.pagesize[0] - doc.rightMargin, 0.58 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 0.38 * inch, "ExpenseAI Project Summary")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_story() -> list:
    story = []
    story.append(rich("TECHNICAL PROJECT SUMMARY", "CoverKicker"))
    story.append(rich("ExpenseAI", "CoverTitle"))
    story.append(p("Complete documentation of technologies, features, backend, database, login, AI, and macOS app packaging.", "Subtitle"))
    story.append(make_table(
        ["Field", "Details"],
        [
            ("Project name", "ExpenseAI (expense-ai)"),
            ("Type", "Smart expense tracker with AI features"),
            ("Prepared on", "May 18, 2026"),
            ("Project folder", str(ROOT)),
            ("Desktop app", "ExpenseAI.app (macOS bundle)"),
        ],
        [1.5 * inch, 4.7 * inch], fill=LIGHT_GRAY,
    ))
    story.append(Spacer(1, 10))
    story.append(callout(
        "One-line summary",
        "ExpenseAI is a full-stack local app: React + TypeScript frontend, Python HTTP backend, SQLite database, secure login with sessions, AI category suggestions, receipt OCR scanning, analytics charts, and a macOS .app that launches everything on localhost.",
        PALE_GREEN,
    ))

    story.append(rich("1. Executive Summary", "H1"))
    story.append(bullet_items([
        "ExpenseAI tracks personal expenses with AI-assisted categorization, spending insights, and receipt scanning.",
        "Users sign up or log in with email and password. All expenses are stored per user in a SQLite database.",
        "The frontend is a React single-page app built with Vite and styled with Tailwind CSS.",
        "The backend is a custom Python server (no Flask/Django) that exposes a REST-style JSON API.",
        "Receipt photos are read in the browser using Tesseract.js OCR, then parsed locally.",
        "A macOS desktop app (ExpenseAI.app) bundles the built site plus backend and opens it in the browser.",
    ]))

    story.append(rich("2. Technology Stack", "H1"))
    story.append(make_table(
        ["Area", "Technology", "Where / Files", "Purpose"],
        [
            ("Frontend", "React 18.3 + TypeScript 5.6", "src/App.tsx, src/main.tsx", "Interactive dashboard UI"),
            ("Build tool", "Vite 6 + @vitejs/plugin-react", "vite.config.ts", "Dev server and production build (dist/)"),
            ("Styling", "Tailwind CSS 3 + PostCSS", "tailwind.config.js, src/index.css", "Responsive layout, dark/light theme"),
            ("UI components", "Custom shadcn-style (Button, Card, Input, Label)", "src/components/ui/*", "Reusable form and layout primitives"),
            ("Icons", "lucide-react", "Throughout components", "Sparkles, Camera, Moon, Sun, etc."),
            ("Backend", "Python 3 stdlib (http.server)", "backend/server.py", "REST API + optional static file serving"),
            ("Database", "SQLite 3", "backend/data/expenseai.sqlite3", "Users, sessions, expenses"),
            ("OCR", "Tesseract.js 6", "ReceiptScanPanel.tsx", "Read text from receipt images in browser"),
            ("AI logic", "Local rule-based engine", "src/utils/aiEngine.ts", "Category suggestions and spending insights"),
            ("Desktop app", "macOS .app + LaunchAgent", "ExpenseAI.app/Contents/*", "Double-click to launch on Mac"),
        ],
        [0.9 * inch, 1.4 * inch, 1.6 * inch, 2.3 * inch],
    ))

    story.append(rich("3. Backend (Python API Server)", "H1"))
    story.append(p("The backend runs at http://127.0.0.1:8787 during development. It uses Python's built-in ThreadingHTTPServer — no external web framework."))
    story.append(rich("How to start", "H2"))
    story.append(bullet_items([
        "npm run backend — starts only the Python API server",
        "npm run dev:full — starts backend + Vite frontend together (via backend/dev.py)",
        "npm run serve:full — serves built frontend from dist/ through the backend",
    ]))
    story.append(rich("API Endpoints", "H2"))
    story.append(make_table(
        ["Method", "Route", "Auth required", "What it does"],
        [
            ("GET", "/api/health", "No", "Health check; returns database path"),
            ("POST", "/api/auth/register", "No", "Create account; returns user + session token"),
            ("POST", "/api/auth/login", "No", "Sign in; returns user + session token"),
            ("GET", "/api/auth/me", "Yes (Bearer)", "Return current logged-in user"),
            ("POST", "/api/auth/logout", "Yes", "Invalidate session token"),
            ("GET", "/api/expenses", "Yes", "List all expenses for the user"),
            ("POST", "/api/expenses", "Yes", "Create a new expense"),
            ("PUT", "/api/expenses/{id}", "Yes", "Update an expense"),
            ("DELETE", "/api/expenses/{id}", "Yes", "Delete an expense"),
        ],
        [0.55 * inch, 1.35 * inch, 0.95 * inch, 3.35 * inch],
    ))
    story.append(rich("Security features", "H2"))
    story.append(bullet_items([
        "Passwords hashed with PBKDF2-HMAC-SHA256 (120,000 iterations) + random salt",
        "Session tokens are random URL-safe strings; only SHA-256 hashes stored in DB",
        "Sessions expire after 30 days; expired sessions cleaned on each request",
        "Bearer token sent in Authorization header from frontend",
        "CORS headers enabled for dev proxy",
        "Email validation and minimum 6-character password enforced server-side",
    ]))

    story.append(PageBreak())
    story.append(rich("4. Database (SQLite)", "H1"))
    story.append(callout(
        "Database file location",
        "Development: backend/data/expenseai.sqlite3. Desktop app: ~/Library/Application Support/ExpenseAI/expenseai.sqlite3",
        PALE_YELLOW,
    ))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Table", "Columns / purpose"],
        [
            ("users", "id, email (unique), password_hash, password_salt, created_at"),
            ("sessions", "token_hash (PK), user_id, created_at, expires_at — login sessions"),
            ("expenses", "id, user_id, description, amount, category, date, notes, ai_suggested, created_at, updated_at"),
        ],
        [1.4 * inch, 4.8 * inch],
    ))
    story.append(p("Foreign keys link sessions and expenses to users. Expenses are scoped per user — each user only sees their own data."))

    story.append(rich("5. Frontend Features", "H1"))
    story.append(make_table(
        ["Feature", "Component / File", "Description"],
        [
            ("Main dashboard", "App.tsx", "Login gate, header, stats, expense form, list, insights, charts"),
            ("Add expense", "ExpenseForm.tsx", "Description, amount, date, category, notes; AI suggestion on type"),
            ("Expense list", "ExpenseList.tsx", "View, inline edit, delete expenses"),
            ("Stats overview", "StatsOverview.tsx", "Total spent, this month, AI-categorized count with detail modals"),
            ("Spending chart", "SpendingChart.tsx", "Category totals as progress bars"),
            ("Pie chart", "CategoryPieChart.tsx", "SVG donut chart with time filters and search"),
            ("AI insights", "InsightsPanel.tsx", "Warnings, tips, spending projections from aiEngine"),
            ("Receipt scan", "ReceiptScanPanel.tsx", "Upload photo, camera, webcam; Tesseract OCR"),
            ("Receipt parser", "receiptParser.ts", "Extract merchant, total, line items from OCR text"),
            ("Dark / light theme", "App.tsx + index.css", "Toggle stored in localStorage (theme key)"),
            ("API client", "lib/api.ts", "fetch wrapper with Bearer token for all backend calls"),
        ],
        [1.2 * inch, 1.5 * inch, 3.5 * inch],
    ))

    story.append(rich("6. Login & Authentication", "H1"))
    story.append(rich("Login page (Login.tsx)", "H2"))
    story.append(bullet_items([
        "Single card UI for both Sign In and Sign Up (toggle between modes)",
        "Fields: email and password with validation (email must contain @, password min 6 chars)",
        "Uses shared Input, Button, Label, Card components with dark mode support",
        "Emerald gradient background; loading states while API request runs",
        "On success, App.tsx loads user expenses from backend and shows dashboard",
    ]))
    story.append(rich("Session flow", "H2"))
    story.append(numbered_items([
        "User submits login or register form",
        "Frontend calls POST /api/auth/login or /api/auth/register",
        "Backend returns { user, token }; frontend stores token in localStorage (expenseai_api_token)",
        "All later API calls include Authorization: Bearer <token>",
        "On app load, if token exists, GET /api/auth/me and GET /api/expenses restore session",
        "Logout calls POST /api/auth/logout and clears localStorage token",
    ]))
    story.append(rich("Vite dev proxy", "H2"))
    story.append(p("During development, Vite proxies /api requests to http://127.0.0.1:8787 so the frontend and backend work together without CORS issues."))

    story.append(rich("7. AI Features", "H1"))
    story.append(callout(
        "Important: no cloud LLM",
        "All AI behavior runs locally in the browser. No OpenAI, Gemini, or external API calls. Category suggestions use keyword matching; insights use math on expense data; receipt reading uses Tesseract OCR.",
        PALE_GREEN,
    ))
    story.append(Spacer(1, 6))
    story.append(rich("AI category suggestions (aiEngine.ts)", "H2"))
    story.append(bullet_items([
        "suggestCategory(description) tokenizes text and scores against keyword lists per category",
        "Categories: Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Travel, Other",
        "Recognizes merchants: Zomato, Swiggy, Amazon, Uber, Netflix, etc.",
        "Returns: category, confidence (0–0.96), reason, matched signals, practical action tip",
        "Shown in ExpenseForm as user types description (300ms debounce)",
    ]))
    story.append(rich("AI spending insights", "H2"))
    story.append(bullet_items([
        "generateInsights: category concentration warnings, weekly daily average, monthly projection",
        "calculateCategoryTotals: totals and percentages for charts",
        "Smart tips (e.g. meal prepping if food spend is high)",
    ]))
    story.append(rich("Receipt OCR & parsing", "H2"))
    story.append(make_table(
        ["Step", "Technology", "What happens"],
        [
            ("1. Image input", "File upload, device camera, or live webcam", "User provides receipt photo"),
            ("2. Preprocessing", "HTML Canvas", "Grayscale, contrast boost, upscale for better OCR"),
            ("3. OCR", "Tesseract.js (English worker)", "Extracts raw text from image"),
            ("4. Parsing", "receiptParser.ts", "Finds merchant, total amount, line items, confidence"),
            ("5. Auto-fill", "ExpenseForm", "Fills description, amount, notes; triggers AI category suggestion"),
            ("6. Verify", "UI warnings", "User warned to verify OCR before saving"),
        ],
        [0.9 * inch, 1.5 * inch, 3.8 * inch],
    ))

    story.append(PageBreak())
    story.append(rich("8. macOS Desktop App (ExpenseAI.app)", "H1"))
    story.append(callout(
        "How we made the Mac app",
        "We did NOT use Electron. The Vite production build was copied into a standard macOS .app bundle. A zsh launcher script starts a local Python backend (with SQLite) that also serves the static React site, then opens the default browser to the app URL.",
        PALE_GREEN,
    ))
    story.append(Spacer(1, 6))
    story.append(make_table(
        ["Part", "Path", "Purpose"],
        [
            ("App bundle", "ExpenseAI.app", "Double-clickable Mac application"),
            ("Info.plist", "Contents/Info.plist", "Bundle ID com.local.expenseai, version 1.0.0"),
            ("Launcher", "Contents/MacOS/ExpenseAI", "zsh script: start server, open browser"),
            ("Built frontend", "Contents/Resources/site/", "index.html + Vite JS/CSS assets"),
            ("Backend copy", "Contents/Resources/backend/server.py", "Python API server for desktop"),
            ("Node fallback", "Contents/Resources/server.mjs", "Static server if Python unavailable"),
            ("LaunchAgent", "~/Library/LaunchAgents/com.local.expenseai.server.plist", "Auto-starts server on login"),
            ("App URL", "http://127.0.0.1:8000/index.html", "Opens in default browser"),
            ("Desktop DB", "~/Library/Application Support/ExpenseAI/expenseai.sqlite3", "Per-user data on Mac"),
        ],
        [1.1 * inch, 2.4 * inch, 2.7 * inch],
    ))
    story.append(rich("Desktop launch flow", "H2"))
    story.append(numbered_items([
        "User double-clicks ExpenseAI.app",
        "Launcher checks http://127.0.0.1:8000/api/health",
        "If not running, writes LaunchAgent plist and starts Python backend with --static-dir and --db",
        "Waits up to ~6 seconds for server ready",
        "Opens http://127.0.0.1:8000/index.html in default browser",
    ]))

    story.append(rich("9. How to Run the Project", "H1"))
    story.append(make_table(
        ["Command", "What it does"],
        [
            ("npm install", "Install frontend dependencies"),
            ("npm run dev:full", "Start backend (8787) + Vite dev server (5173) together"),
            ("npm run dev", "Frontend only (needs backend running separately)"),
            ("npm run backend", "Python API only on port 8787"),
            ("npm run build", "TypeScript check + production build to dist/"),
            ("npm run serve:full", "Serve dist/ through backend on port 8787"),
        ],
        [1.8 * inch, 4.4 * inch], fill=LIGHT_GRAY,
    ))

    story.append(rich("10. Project File Structure", "H1"))
    story.append(make_table(
        ["Path", "Role"],
        [
            ("src/App.tsx", "Root component: auth, theme, layout, state"),
            ("src/lib/api.ts", "Backend API client (auth + expenses)"),
            ("src/components/auth/Login.tsx", "Login / sign-up page"),
            ("src/utils/aiEngine.ts", "Category AI + insights engine"),
            ("src/utils/receiptParser.ts", "Receipt text parser"),
            ("backend/server.py", "Python HTTP API + SQLite"),
            ("backend/dev.py", "Runs backend + Vite together"),
            ("backend/data/", "SQLite database folder"),
            ("ExpenseAI.app/", "macOS desktop application bundle"),
            ("dist/", "Production build output"),
            ("reports/", "This PDF and build scripts"),
        ],
        [2.0 * inch, 4.2 * inch],
    ))

    story.append(rich("11. npm Dependencies", "H1"))
    story.append(make_table(
        ["Package", "Version", "Used for"],
        [
            ("react / react-dom", "18.3.1", "UI framework"),
            ("vite", "6.0.3", "Build and dev server"),
            ("typescript", "5.6.3", "Type safety"),
            ("tailwindcss", "3.4.15", "Utility CSS"),
            ("tesseract.js", "6.0.0", "Receipt OCR"),
            ("lucide-react", "0.468.0", "Icons"),
            ("clsx + tailwind-merge", "latest", "Conditional CSS classes"),
        ],
        [1.4 * inch, 0.9 * inch, 3.9 * inch],
    ))

    return story


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=LETTER,
        leftMargin=0.78 * inch,
        rightMargin=0.78 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.72 * inch,
        title="ExpenseAI Project Summary",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=footer)])
    doc.build(build_story())
    print(f"PDF created: {OUT}")


if __name__ == "__main__":
    build()
