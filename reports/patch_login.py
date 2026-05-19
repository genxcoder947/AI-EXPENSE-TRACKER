#!/usr/bin/env python3
from pathlib import Path

template = Path(__file__).resolve().parent / "Login.tsx.template"
out = Path(__file__).resolve().parents[1] / "src/components/auth/Login.tsx"

text = template.read_text().replace("__CED__", "</" + "motionlessLoginShell>").replace(
    "</" + "motionlessLoginShell>", "</" + "div>"
)

replacements = [
    (
        "await resetPassword(resetCode.trim(), password);\n      if (onPasswordReset)",
        "await resetPassword(resetCode.trim(), password);\n"
        "      setInfo('Password updated successfully. Signing you in...');\n"
        "      if (onPasswordReset)",
    ),
    (
        """        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <motionlessLoginShell title="" subtitle="">
              <></>
            </motionlessLoginShell>
            <div>
              <Label htmlFor="forgot-email">Email</Label>""",
        """        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Step 1 of 2 — Get your reset code
            </p>
            <div>
              <Label htmlFor="forgot-email">Email</Label>""",
    ),
]

# fix - first replacement in list has motionless - template doesn't have that block
replacements = [
    (
        "await resetPassword(resetCode.trim(), password);\n      if (onPasswordReset)",
        "await resetPassword(resetCode.trim(), password);\n"
        "      setInfo('Password updated successfully. Signing you in...');\n"
        "      if (onPasswordReset)",
    ),
    (
        """        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="forgot-email">Email</Label>""",
        """        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Step 1 of 2 — Get your reset code
            </p>
            <div>
              <Label htmlFor="forgot-email">Email</Label>""",
    ),
    (
        """              {loading ? 'Sending reset code...' : 'Get reset code'}
            </Button>
          </form>
        )}

        {view === 'reset'""",
        """              {loading ? 'Sending reset code...' : 'Get reset code'}
            </Button>
            {issuedResetCode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => switchView('reset')}
              >
                Continue to set new password
              </Button>
            )}
          </form>
        )}

        {view === 'reset'""",
    ),
    (
        """        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {info &&""",
        """        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Step 2 of 2 — Create your new password
            </p>
            {info &&""",
    ),
    (
        """              autoComplete="one-time-code"
              />
            </div>
            <motionlessLoginShell title="" subtitle="">
              <></>
            </motionlessLoginShell>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
        """              autoComplete="one-time-code"
              />
            </motionlessLoginShell>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Enter your new password below
              </p>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
    ),
]

# third replacement in list still has motionless typo in new_string - fix
replacements[4] = (
    """              autoComplete="one-time-code"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
    """              autoComplete="one-time-code"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Enter your new password below
              </p>
            <motionlessLoginShell title="" subtitle="">
              <></>
            </motionlessLoginShell>
            <motionlessLoginShell title="" subtitle="">
              <></>
            </motionlessLoginShell>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
)

# I'm still introducing motionless. Use only div:
replacements[4] = (
    """              autoComplete="one-time-code"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
    """              autoComplete="one-time-code"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Enter your new password below
              </p>
            <div>
              <Label htmlFor="new-password">New password</Label>""",
)

# close wrapper div before error in reset form
replacements.append(
    (
        """                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Set new password'}
            </Button>
          </form>
        )}

        {(view === 'login' || view === 'signup')""",
        """                disabled={loading}
              />
            </div>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Set new password'}
            </Button>
          </form>
        )}

        {(view === 'login' || view === 'signup')""",
    )
)

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"patch block not found:\n{old[:80]}...")
    text = text.replace(old, new, 1)

out.write_text(text)
bad = "motionless"
print("wrote", out, "lines", len(text.splitlines()), "has_bad", bad in text)
