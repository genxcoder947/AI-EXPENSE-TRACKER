import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { requestPasswordReset, resetPassword } from '../../lib/api';
import { Brain, Sparkles, Zap, Lock, Mail, ArrowRight, Eye, EyeOff, TrendingUp, Wallet, CreditCard, BarChart3, Bot, Cpu, Database, Network, Shield } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onPasswordReset?: () => Promise<void>;
};

function ResetCodeBox({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-400 mb-2">Your reset code</p>
      <p className="mt-1 break-all font-mono text-lg text-white font-bold tracking-wider">{code}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-2 mx-auto"
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const aiImages = [
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&h=600&fit=crop'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % aiImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      if (result.resetCode) {
        // Email not configured, show code directly
        setIssuedResetCode(result.resetCode);
        setResetCode(result.resetCode);
        setInfo(`Your reset code is below. It expires in ${result.expiresInMinutes ?? 60} minutes.`);
        setView('reset');
      } else if (result.emailEnabled) {
        // Email configured, OTP sent to email
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-4 h-4 bg-emerald-400 rounded-full animate-bounce opacity-50" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-40 w-3 h-3 bg-teal-400 rounded-full animate-bounce opacity-50" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-32 w-5 h-5 bg-blue-400 rounded-full animate-bounce opacity-50" style={{ animationDuration: '5s', animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-emerald-300 rounded-full animate-bounce opacity-50" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-teal-300 rounded-full animate-bounce opacity-50" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }}></div>
        
        {/* Moving gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDQwIDBIMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - AI Image and Branding */}
          <div className="hidden lg:block space-y-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur-lg opacity-30"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={aiImages[currentImageIndex]}
                  alt="AI Technology"
                  className="w-full h-[500px] object-cover transition-opacity duration-1000"
                  style={{ opacity: 1 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                
                {/* Floating AI Icons */}
                <div className="absolute top-8 right-8 flex gap-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20 animate-bounce" style={{ animationDelay: '0s' }}>
                    <Bot className="w-6 h-6 text-teal-400" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20 animate-bounce" style={{ animationDelay: '0.5s' }}>
                    <Cpu className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-full p-3 border border-white/20 animate-bounce" style={{ animationDelay: '1s' }}>
                    <Database className="w-6 h-6 text-blue-400" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-10 h-10 text-teal-400" />
                    <h2 className="text-3xl font-bold text-white">ExpenseAI</h2>
                  </div>
                  <p className="text-slate-300 text-lg">
                    Powered by artificial intelligence to transform your expense tracking experience
                  </p>
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <Sparkles className="w-8 h-8 text-emerald-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">Smart AI</h3>
                <p className="text-slate-400 text-xs mt-1">Intelligent categorization</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <Zap className="w-8 h-8 text-teal-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">Fast</h3>
                <p className="text-slate-400 text-xs mt-1">Lightning quick insights</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <Lock className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">Secure</h3>
                <p className="text-slate-400 text-xs mt-1">Your data stays local</p>
              </div>
            </div>

            {/* Additional AI features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">Analytics</h3>
                <p className="text-slate-400 text-xs mt-1">Smart spending insights</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <Wallet className="w-8 h-8 text-yellow-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">Budgeting</h3>
                <p className="text-slate-400 text-xs mt-1">AI-powered suggestions</p>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 space-y-6">
              {/* Mobile branding */}
              <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
                <Brain className="w-10 h-10 text-teal-400" />
                <h2 className="text-3xl font-bold text-white">ExpenseAI</h2>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
                  {view === 'login' && <Lock className="w-8 h-8 text-white" />}
                  {view === 'signup' && <Sparkles className="w-8 h-8 text-white" />}
                  {(view === 'forgot' || view === 'reset') && <Mail className="w-8 h-8 text-white" />}
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                <p className="text-slate-300">{subtitle}</p>
              </div>

              {view === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
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
                        className="w-full pl-10 bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  {info && <p className="text-sm text-teal-400">{info}</p>}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg" disabled={loading}>
                    {loading ? 'Sending reset code...' : 'Get reset code'}
                  </Button>
                  {issuedResetCode && (
                    <Button
                      type="button"
                      className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20 font-semibold"
                      onClick={() => switchView('reset')}
                    >
                      Continue to set new password
                    </Button>
                  )}
                </form>
              )}

              {view === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
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
                      className="w-full font-mono text-sm bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                      disabled={loading}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-4">
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
                          className="w-full pl-10 pr-10 bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
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
                          className="w-full pl-10 bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg" disabled={loading}>
                    {loading ? 'Updating password...' : 'Set new password'}
                  </Button>
                </form>
              )}

              {(view === 'login' || view === 'signup') && (
                <form onSubmit={handleLoginOrSignUp} className="space-y-4">
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
                        className="w-full pl-10 bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
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
                        className="w-full pl-10 pr-10 bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {view === 'login' && (
                    <p className="text-right text-sm">
                      <span
                        className="text-teal-400 hover:text-teal-300 cursor-pointer"
                        onClick={() => switchView('forgot')}
                      >
                        Forgot password?
                      </span>
                    </p>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg" disabled={loading}>
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
                      className="text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
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
                      className="text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
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
                      className="text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
                      onClick={() => switchView('login')}
                    >
                      Back to sign in
                    </span>
                  </p>
                )}
                {view === 'reset' && (
                  <p>
                    <span
                      className="text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
                      onClick={() => switchView('forgot')}
                    >
                      Request a new code
                    </span>
                    {' · '}
                    <span
                      className="text-teal-400 hover:text-teal-300 cursor-pointer font-medium"
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
