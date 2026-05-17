import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';

type LoginProps = {
  onLogin: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
};

export default function Login({ onLogin, onSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // true for login, false for sign up

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simple validation
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

    if (isLogin) {
      onLogin(email, password);
    } else {
      onSignUp(email, password);
    }
    // Note: The callback functions will handle setting user state etc.
    // We'll reset loading after a short delay to allow UI feedback; in a real app,
    // we would rely on the callbacks to manage state and then stop loading via props or context.
    // For simplicity, we'll reset loading after 1 second if still loading.
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-300 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isLogin ? 'Welcome to ExpenseAI' : 'Create Account'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isLogin ? 'Please sign in to continue' : 'Sign up to get started'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          {isLogin ? (
            <p>
              Don't have an account? <span className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer" onClick={() => setIsLogin(false)}>
                Sign up
              </span>
            </p>
          ) : (
            <p>
              Already have an account? <span className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer" onClick={() => setIsLogin(true)}>
                Sign in
              </span>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
