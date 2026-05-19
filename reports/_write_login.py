from pathlib import Path

LOGIN = Path(__file__).resolve().parents[1] / "src/components/auth/Login.tsx"

LOGIN.write_text(
    """import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { requestPasswordReset, resetPassword } from '../../lib/api';

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onPasswordReset?: () => Promise<void>;
};

function ResetCodeBox({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <motionlessLoginShell title="" subtitle="">
      <></>
    </motionlessLoginShell>
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
        setIssuedResetCode(result.resetCode);
        setResetCode(result.resetCode);
        setInfo(`Your reset code is below. It expires in ${result.expiresInMinutes ?? 60} minutes.`);
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
    <motionlessLoginShell title={title} subtitle={subtitle}>
      <></>
    </motionlessLoginShell>
  );
}
"""
)

print("wrote", LOGIN)
