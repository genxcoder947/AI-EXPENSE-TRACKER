import { Card } from './ui/card';
import { Button } from './ui/button';
import { User, Mail, Calendar, Shield, Database, Trash2, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

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
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl">
            {getInitials(userEmail)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
              {userEmail}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Account Owner</p>
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
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Currency Settings
        </h3>
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
