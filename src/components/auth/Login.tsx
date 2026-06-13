import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { requestPasswordReset, resetPassword } from '../../lib/api';
import { ArrowRight, Brain, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onPasswordReset?: () => Promise<void>;
};

function ResetCodeBox({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 backdrop-blur-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-400 mb-2">Your reset code</p>
      <p className="mt-1 break-all font-mono text-lg text-white font-bold tracking-wider">{code}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-2 mx-auto transition-all"
      >
        <ArrowRight className="w-4 h-4" />
        Copy code
      </button>
      <p className="mt-3 text-xs text-slate-400">
        This app runs locally without email. Save this code before continuing.
      </p>
    </div>
  );
}

export default function Login({ onLogin, onSignUp, onPasswordReset }: LoginProps) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [issuedResetCode, setIssuedResetCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const switchView = (next: AuthView) => {
    resetMessages();
    setView(next);
    if (next === 'login' || next === 'signup') {
      setPassword('');
      setConfirmPassword('');
      setResetCode('');
      setIssuedResetCode(null);
    }
  };

  const handleLoginOrSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    if (!email.includes('@') || !email) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (view === 'login') {
        await onLogin(email, password);
      } else {
        await onSignUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    if (!email.includes('@') || !email) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    try {
      const result = await requestPasswordReset(email);
      
      // Always show reset code if returned (as backup or primary method)
      if (result.resetCode) {
        setIssuedResetCode(result.resetCode);
        setResetCode(result.resetCode);
        
        if (result.emailSent) {
          setInfo(`Password reset OTP sent to your email. You can also use the code below as a backup. It expires in ${result.expiresInMinutes ?? 60} minutes.`);
        } else {
          setInfo(`Email not configured or sending failed. Use the reset code below to reset your password. It expires in ${result.expiresInMinutes ?? 60} minutes.`);
        }
        setView('reset');
      } else if (result.emailEnabled) {
        // Email configured but no code returned (shouldn't happen with new backend logic)
        setInfo('A password reset OTP has been sent to your email address. Please check your inbox.');
        setView('reset');
      } else {
        setInfo(
          'If an account exists for this email, a reset code was created. If you do not see a code, double-check the email or sign up.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    if (!resetCode.trim()) {
      setError('Please enter your reset code');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await resetPassword(resetCode.trim(), password);
      setInfo('Password updated successfully. Signing you in...');
      if (onPasswordReset) {
        await onPasswordReset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyResetCode = async () => {
    if (!issuedResetCode) return;
    try {
      await navigator.clipboard.writeText(issuedResetCode);
      setInfo('Reset code copied to clipboard.');
    } catch {
      setInfo('Could not copy automatically. Select and copy the code manually.');
    }
  };

  const title =
    view === 'login'
      ? 'Welcome to ExpenseAI'
      : view === 'signup'
        ? 'Create Account'
        : view === 'forgot'
          ? 'Forgot Password'
          : 'Reset Password';

  const subtitle =
    view === 'login'
      ? 'Please sign in to continue'
      : view === 'signup'
        ? 'Sign up to get started'
        : view === 'forgot'
          ? 'Enter your account email to get a reset code'
          : 'Enter your reset code and choose a new password';

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-4 h-4 bg-teal-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-40 w-3 h-3 bg-cyan-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-32 w-5 h-5 bg-blue-400 rounded-full animate-bounce opacity-60" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-emerald-300 rounded-full animate-bounce opacity-60" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-teal-300 rounded-full animate-bounce opacity-60" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }}></div>
        <div className="absolute top-2/3 left-1/4 w-4 h-4 bg-cyan-300 rounded-full animate-bounce opacity-60" style={{ animationDuration: '4.5s', animationDelay: '0.8s' }}></div>
        
        {/* Moving gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-teal-600/40 to-cyan-600/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/30 to-emerald-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-r from-cyan-600/35 to-teal-600/35 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }}></div>
      </div>

      {/* Animated grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQwIDBIMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20 animate-pulse"></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-white/10 backdrop-blur-3xl border border-white/20 shadow-2xl p-8 space-y-6 relative overflow-hidden">
              {/* Glass shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Mobile branding */}
              <div className="lg:hidden flex items-center gap-3 justify-center mb-6 relative z-10">
                <Brain className="w-10 h-10 text-teal-400" />
                <h2 className="text-3xl font-bold text-white">ExpenseAI</h2>
              </div>

              <div className="text-center relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500/30 to-cyan-500/30 backdrop-blur-xl rounded-2xl mb-4 shadow-lg border border-white/30">
                  {view === 'login' && <Lock className="w-8 h-8 text-white" />}
                  {view === 'signup' && <Sparkles className="w-8 h-8 text-white" />}
                  {(view === 'forgot' || view === 'reset') && <Mail className="w-8 h-8 text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                <p className="text-slate-300">{subtitle}</p>
              </div>

              {view === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-400">
                    Step 1 of 2 — Get your reset code
                  </p>
                  <div>
                    <Label htmlFor="forgot-email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="email"
                        id="forgot-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your account email"
                        className="w-full pl-10 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {info && <p className="text-sm text-teal-400">{info}</p>}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-teal-500/80 to-cyan-500/80 backdrop-blur-xl hover:from-teal-600/80 hover:to-cyan-600/80 text-white font-semibold shadow-lg border border-white/30 transition-all" disabled={loading}>
                    {loading ? 'Sending reset code...' : 'Get reset code'}
                  </Button>
                  {issuedResetCode && (
                    <Button
                      type="button"
                      className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/15 font-semibold transition-all"
                      onClick={() => switchView('reset')}
                    >
                      Continue to set new password
                    </Button>
                  )}
                </form>
              )}

              {view === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4 relative z-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-400">
                    Step 2 of 2 — Create your new password
                  </p>
                  {info && <p className="text-sm text-teal-400">{info}</p>}
                  {issuedResetCode && (
                    <ResetCodeBox code={issuedResetCode} onCopy={() => void copyResetCode()} />
                  )}
                  <div>
                    <Label htmlFor="reset-code" className="text-slate-300">Reset code</Label>
                    <Input
                      type="text"
                      id="reset-code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Paste your reset code"
                      className="w-full font-mono text-sm bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 transition-all"
                      disabled={loading}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-xl p-4 space-y-4">
                    <p className="text-sm font-medium text-white">
                      Enter your new password below
                    </p>
                    <div>
                      <Label htmlFor="new-password" className="text-slate-300">New password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          id="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-10 pr-10 bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 transition-all"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-all"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="text-slate-300">Confirm new password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full pl-10 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-teal-500/80 to-cyan-500/80 backdrop-blur-xl hover:from-teal-600/80 hover:to-cyan-600/80 text-white font-semibold shadow-lg border border-white/30 transition-all" disabled={loading}>
                    {loading ? 'Updating password...' : 'Set new password'}
                  </Button>
                </form>
              )}

              {(view === 'login' || view === 'signup') && (
                <form onSubmit={handleLoginOrSignUp} className="space-y-4 relative z-10">
                  <div>
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-10 bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 transition-all"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-all"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {view === 'login' && (
                    <p className="text-right text-sm">
                      <span
                        className="text-teal-400 hover:text-teal-300 cursor-pointer transition-all"
                        onClick={() => switchView('forgot')}
                      >
                        Forgot password?
                      </span>
                    </p>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-teal-500/80 to-cyan-500/80 backdrop-blur-xl hover:from-teal-600/80 hover:to-cyan-600/80 text-white font-semibold shadow-lg border border-white/30 transition-all" disabled={loading}>
                    {loading
                      ? view === 'login'
                        ? 'Signing in...'
                        : 'Creating account...'
                      : view === 'login'
                        ? 'Sign In'
                        : 'Sign Up'}
                  </Button>
                </form>
              )}

              <div className="text-center text-sm text-slate-400 space-y-2">
                {view === 'login' && (
                  <p>
                    Don&apos;t have an account?{' '}
                    <span
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                      onClick={() => switchView('signup')}
                    >
                      Sign up
                    </span>
                  </p>
                )}
                {view === 'signup' && (
                  <p>
                    Already have an account?{' '}
                    <span
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                      onClick={() => switchView('login')}
                    >
                      Sign in
                    </span>
                  </p>
                )}
                {view === 'forgot' && (
                  <p>
                    Remember your password?{' '}
                    <span
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                      onClick={() => switchView('login')}
                    >
                      Back to sign in
                    </span>
                  </p>
                )}
                {view === 'reset' && (
                  <p>
                    <span
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                      onClick={() => switchView('forgot')}
                    >
                      Request a new code
                    </span>
                    {' · '}
                    <span
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                      onClick={() => switchView('login')}
                    >
                      Back to sign in
                    </span>
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
