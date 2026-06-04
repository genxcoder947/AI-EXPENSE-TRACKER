import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { User, Mail, Calendar, Shield, Database, Trash2, DollarSign, Camera, X, RefreshCw } from 'lucide-react';
import { formatCurrency, refreshCurrencyRates, getExchangeRates, getExchangeRate } from '../utils/helpers';

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
  currentCurrency
}: AccountSettingsProps) {
  const [profilePicture, setProfilePicture] = useState<string | null>(() => {
    return localStorage.getItem('profilePicture');
  });
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {profilePicture ? (
              <>
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500"
                />
                <button
                  onClick={handleRemoveProfilePicture}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove profile picture"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-2xl">
                {getInitials(userEmail)}
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
              {userEmail}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Account Owner</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {profilePicture ? 'Profile picture set' : 'Click to add profile picture'}
            </p>
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-800 dark:text-white">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Member Since</p>
              <p className="font-medium text-slate-800 dark:text-white">{formatDate(userCreatedAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Statistics */}
      <Card className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Account Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses, currentCurrency)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{expenseCount} transactions</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome, currentCurrency)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{incomeCount} transactions</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Net Balance</p>
            <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalIncome - totalExpenses, currentCurrency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Savings</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-purple-500">{expenseCount + incomeCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All time</p>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Settings
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Password</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Last changed recently</p>
            </div>
            <Button className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Currency Settings */}
      <Card className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Currency Settings
          </h3>
          <Button
            onClick={handleRefreshRates}
            disabled={isRefreshing}
            className={`text-sm flex items-center gap-2 ${
              isDarkMode 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
            <p className="font-medium text-slate-800 dark:text-white mb-2">Select Currency</p>
            <select
              value={currentCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className={`w-full p-2 rounded border ${
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
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              This will change the currency symbol used throughout the app.
            </p>
          </div>
          
          {exchangeRates && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
              <p className="font-medium text-slate-800 dark:text-white mb-2">Current Exchange Rates (vs USD)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {currencies.map((currency) => (
                  <div key={currency.code} className={`p-2 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-white'}`}>
                    <p className="font-medium text-slate-800 dark:text-white">{currency.code}</p>
                    <p className="text-slate-600 dark:text-slate-400">
                      {exchangeRates[currency.code] ? exchangeRates[currency.code].toFixed(4) : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
              {lastUpdated && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className={`p-6 border-red-200 dark:border-red-800 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Danger Zone
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Sign Out</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Sign out of your account</p>
            </div>
            <Button className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
