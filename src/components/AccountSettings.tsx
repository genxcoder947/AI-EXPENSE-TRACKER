import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Mail, Calendar, Shield, Database, Trash2, DollarSign, Camera, X, RefreshCw, LogOut, Lock, Bell, Globe, Palette, Sun, Moon, XCircle, Key, Sparkles } from 'lucide-react';
import { formatCurrency, refreshCurrencyRates, getExchangeRates, getExchangeRate } from '../utils/helpers';
import { requestPasswordReset, resetPassword } from '../lib/api';

interface AccountSettingsProps {
  userEmail: string;
  userCreatedAt: string;
  totalExpenses: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount: number;
  isDarkMode: boolean;
  onLogout: () => void;
  onCurrencyChange: (currency: string) => void;
  currentCurrency: string;
  onThemeToggle?: () => void;
}

export default function AccountSettings({
  userEmail,
  userCreatedAt,
  totalExpenses,
  totalIncome,
  expenseCount,
  incomeCount,
  isDarkMode,
  onLogout,
  onCurrencyChange,
  currentCurrency,
  onThemeToggle
}: AccountSettingsProps) {
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    return localStorage.getItem('profilePicture');
  });
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    return localStorage.getItem('groqApiKey') || '';
  });
  const [aiModel, setAiModel] = useState<'local' | 'groq'>(() => {
    return (localStorage.getItem('aiModel') as 'local' | 'groq') || 'local';
  });
  const [smtpServer, setSmtpServer] = useState<string>(() => {
    return localStorage.getItem('smtpServer') || 'smtp.gmail.com';
  });
  const [smtpPort, setSmtpPort] = useState<string>(() => {
    return localStorage.getItem('smtpPort') || '587';
  });
  const [smtpEmail, setSmtpEmail] = useState<string>(() => {
    return localStorage.getItem('smtpEmail') || '';
  });
  const [smtpPassword, setSmtpPassword] = useState<string>(() => {
    return localStorage.getItem('smtpPassword') || '';
  });

  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    try {
      const rates = await getExchangeRates();
      setExchangeRates(rates);
      
      const stored = localStorage.getItem('exchangeRates');
      if (stored) {
        const data = JSON.parse(stored);
        setLastUpdated(new Date(data.timestamp).toLocaleString());
      }
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    }
  };

  const handleSaveGroqKey = () => {
    localStorage.setItem('groqApiKey', groqApiKey);
    localStorage.setItem('aiModel', aiModel);
    alert('AI settings saved successfully!');
  };

  const handleAiModelChange = (model: 'local' | 'groq') => {
    setAiModel(model);
    localStorage.setItem('aiModel', model);
  };

  const handleSaveEmailSettings = async () => {
    try {
      const response = await fetch('/api/config/smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server: smtpServer,
          port: smtpPort,
          email: smtpEmail,
          password: smtpPassword,
          use_tls: true,
          use_ssl: false,
        }),
      });
      
      if (response.ok) {
        alert('Email settings saved successfully!');
      } else {
        alert('Failed to save email settings. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save email settings:', error);
      alert('Failed to save email settings. Please try again.');
    }
  };

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      await refreshCurrencyRates();
      await loadExchangeRates();
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Request password reset for the user's email
      const resetResult = await requestPasswordReset(userEmail);
      
      if (resetResult.resetCode) {
        // Use the reset code to change the password
        await resetPassword(resetResult.resetCode, newPassword);
        setPasswordSuccess('Password changed successfully!');
        setTimeout(() => {
          setShowChangePassword(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSuccess(null);
        }, 2000);
      } else {
        setPasswordError('Failed to initiate password change. Please try again.');
      }
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);
        localStorage.setItem('profilePicture', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    localStorage.removeItem('profilePicture');
  };

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  ];

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className={`p-8 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
        <div className="flex items-center gap-8">
          <div className="relative group">
            {profilePicture ? (
              <>
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-emerald-500 shadow-lg"
                />
                <button
                  onClick={handleRemoveProfilePicture}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  title="Remove profile picture"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {getInitials(userEmail)}
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-8 h-8 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
              {userEmail}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">Account Owner</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {profilePicture ? '✓ Profile picture set' : 'Click to add profile picture'}
            </p>
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <User className="w-7 h-7 text-emerald-500" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <Mail className="w-7 h-7 text-slate-500" />
            <div className="flex-1">
              <p className="text-base text-slate-600 dark:text-slate-400">Email</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <Calendar className="w-7 h-7 text-slate-500" />
            <div className="flex-1">
              <p className="text-base text-slate-600 dark:text-slate-400">Member Since</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">{formatDate(userCreatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-emerald-500" />
            Account Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-2">Total Expenses</p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300 whitespace-nowrap overflow-x-auto">{formatCurrency(totalExpenses, currentCurrency)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{expenseCount} transactions</p>
            </div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300 whitespace-nowrap overflow-x-auto">{formatCurrency(totalIncome, currentCurrency)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{incomeCount} transactions</p>
            </div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-2">Net Balance</p>
              <p className={`text-3xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'} whitespace-nowrap overflow-x-auto`}>
                {formatCurrency(totalIncome - totalExpenses, currentCurrency)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Savings</p>
            </div>
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <p className="text-base text-slate-600 dark:text-slate-400 mb-2">Total Transactions</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap overflow-x-auto">{expenseCount + incomeCount}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">All time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Palette className="w-7 h-7 text-emerald-500" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div className="flex items-center gap-4">
              {isDarkMode ? <Moon className="w-7 h-7 text-slate-500" /> : <Sun className="w-7 h-7 text-slate-500" />}
              <div>
                <p className="text-lg font-medium text-slate-800 dark:text-white">Dark Mode</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Toggle dark/light theme</p>
              </div>
            </div>
            <Button
              onClick={onThemeToggle}
              className={`px-6 py-3 text-base ${
                isDarkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {isDarkMode ? 'Light' : 'Dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-emerald-500" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div className="flex items-center gap-4">
              <Lock className="w-7 h-7 text-slate-500" />
              <div>
                <p className="text-lg font-medium text-slate-800 dark:text-white">Password</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Last changed recently</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowChangePassword(true)}
              className="px-6 py-3 text-base border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-emerald-500" />
              Currency Settings
            </CardTitle>
            <Button
              onClick={handleRefreshRates}
              disabled={isRefreshing}
              className={`text-base flex items-center gap-2 px-4 py-2 ${
                isDarkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <p className="text-lg font-medium text-slate-800 dark:text-white mb-3">Select Currency</p>
            <select
              value={currentCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className={`w-full p-3 text-base rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name} ({currency.code})
                </option>
              ))}
            </select>
            <p className="text-base text-slate-600 dark:text-slate-400 mt-3">
              This will change the currency symbol used throughout the app.
            </p>
          </div>
          
          {exchangeRates && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
              <p className="text-lg font-medium text-slate-800 dark:text-white mb-3">Current Exchange Rates (vs USD)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currencies.map((currency) => (
                  <div key={currency.code} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
                    <p className="font-semibold text-slate-800 dark:text-white">{currency.code}</p>
                    <p className="text-base text-slate-600 dark:text-slate-400">
                      {exchangeRates[currency.code] ? exchangeRates[currency.code].toFixed(4) : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
              {lastUpdated && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-emerald-500" />
            AI Assistant Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
            <p className="text-lg font-medium text-slate-800 dark:text-white mb-3">AI Model</p>
            <div className="flex gap-3">
              <Button
                onClick={() => handleAiModelChange('local')}
                className={`flex-1 text-base ${
                  aiModel === 'local'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Local (Basic)
              </Button>
              <Button
                onClick={() => handleAiModelChange('groq')}
                className={`flex-1 text-base ${
                  aiModel === 'groq'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Groq (Advanced)
              </Button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              Local: Works offline with basic pattern matching. Groq: Advanced AI with natural language understanding (requires API key).
            </p>
          </div>

          {aiModel === 'groq' && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <Key className="w-5 h-5 text-slate-500" />
                <p className="text-lg font-medium text-slate-800 dark:text-white">Groq API Key</p>
              </div>
              <Input
                type="password"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="Enter your Groq API key"
                className={`w-full p-3 text-base rounded-lg border ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                Get your free API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Groq Console</a>. Your key is stored locally and never sent to our servers.
              </p>
              <Button
                onClick={handleSaveGroqKey}
                className="mt-3 px-6 py-3 text-base bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Save API Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Mail className="w-7 h-7 text-emerald-500" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configure SMTP settings to send password reset emails to your inbox. For Gmail, enable 2-factor authentication and generate an app-specific password at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Google App Passwords</a>.
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="smtp-server" className="text-sm font-medium text-slate-700 dark:text-slate-300">SMTP Server</Label>
              <Input
                id="smtp-server"
                type="text"
                value={smtpServer}
                onChange={(e) => setSmtpServer(e.target.value)}
                placeholder="smtp.gmail.com"
                className={`mt-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>
            <div>
              <Label htmlFor="smtp-port" className="text-sm font-medium text-slate-700 dark:text-slate-300">SMTP Port</Label>
              <Input
                id="smtp-port"
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className={`mt-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>
            <div>
              <Label htmlFor="smtp-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
              <Input
                id="smtp-email"
                type="email"
                value={smtpEmail}
                onChange={(e) => setSmtpEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                className={`mt-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>
            <div>
              <Label htmlFor="smtp-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Password / App Password</Label>
              <Input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Your email password or app-specific password"
                className={`mt-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>
          </div>
          <Button
            onClick={handleSaveEmailSettings}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5"
          >
            Save Email Settings
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className={`p-8 border-2 border-red-200 dark:border-red-800 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400 flex items-center gap-3">
            <Trash2 className="w-7 h-7" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-4">
              <LogOut className="w-7 h-7 text-red-500" />
              <div>
                <p className="text-lg font-medium text-slate-800 dark:text-white">Sign Out</p>
                <p className="text-base text-slate-600 dark:text-slate-400">Sign out of your account</p>
              </div>
            </div>
            <Button className="px-6 py-3 text-base bg-red-600 text-white hover:bg-red-700 shadow-md" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl shadow-2xl max-w-md w-full p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Change Password</h3>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <XCircle className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            {passwordSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-400">{passwordSuccess}</p>
              </div>
            )}

            {passwordError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400">{passwordError}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-base text-slate-700 dark:text-slate-300 mb-2 block">New Password</Label>
                <Input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full"
                  disabled={isChangingPassword}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-base text-slate-700 dark:text-slate-300 mb-2 block">Confirm New Password</Label>
                <Input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full"
                  disabled={isChangingPassword}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="flex-1 px-6 py-3 text-base border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 px-6 py-3 text-base bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
