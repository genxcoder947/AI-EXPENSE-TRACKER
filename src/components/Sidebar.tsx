import { useState } from 'react';
import {
  LayoutDashboard,
  Plus,
  History,
  TrendingUp,
  PieChart,
  Settings,
  Menu,
  X,
  Wallet,
  Calendar,
  BarChart3,
  DollarSign
} from 'lucide-react';
import UserProfile from './UserProfile';

type View = 'dashboard' | 'add-expense' | 'add-income' | 'history' | 'income-history' | 'analytics' | 'insights' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  userEmail: string;
  onLogout: () => void;
}

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  isCollapsed, 
  onToggleCollapse,
  isDarkMode,
  userEmail,
  onLogout
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'add-expense' as View, icon: Plus, label: 'Add Expense' },
    { id: 'add-income' as View, icon: DollarSign, label: 'Add Income' },
    { id: 'history' as View, icon: History, label: 'Expense History' },
    { id: 'income-history' as View, icon: DollarSign, label: 'Income History' },
    { id: 'analytics' as View, icon: BarChart3, label: 'Analytics' },
    { id: 'insights' as View, icon: TrendingUp, label: 'AI Insights' },
    { id: 'settings' as View, icon: Settings, label: 'Settings' },
  ];

  return (
    <div 
      className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${isDarkMode ? 'bg-slate-800 border-r border-slate-700' : 'bg-white border-r border-slate-200'}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-lg text-slate-800 dark:text-white">ExpenseAI</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode 
              ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
          }`}
        >
          {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? isDarkMode
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <UserProfile
        userEmail={userEmail}
        onLogout={onLogout}
        onSettingsClick={() => onViewChange('settings')}
        isDarkMode={isDarkMode}
        isCollapsed={isCollapsed}
      />
    </div>
  );
}
