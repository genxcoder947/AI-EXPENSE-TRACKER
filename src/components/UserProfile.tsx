import { useState } from 'react';
import { User, LogOut, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface UserProfileProps {
  userEmail: string;
  onLogout: () => void;
  onSettingsClick: () => void;
  isDarkMode: boolean;
  isCollapsed: boolean;
}

export default function UserProfile({ 
  userEmail, 
  onLogout, 
  onSettingsClick,
  isDarkMode,
  isCollapsed 
}: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
      {!isCollapsed ? (
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
              isDarkMode 
                ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {getInitials(userEmail)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userEmail}</p>
              <p className="text-xs opacity-70">Account</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            )}
          </button>

          {isExpanded && (
            <div className="ml-2 space-y-1">
              <button
                onClick={onSettingsClick}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isDarkMode 
                    ? 'text-slate-300 hover:bg-slate-700 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
              <button
                onClick={onLogout}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isDarkMode 
                    ? 'text-red-400 hover:bg-slate-700 hover:text-red-300' 
                    : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-center p-2 rounded-lg transition-all ${
            isDarkMode 
              ? 'hover:bg-slate-700 text-slate-300 hover:text-white' 
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
          }`}
          title="Account"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
            {getInitials(userEmail)}
          </div>
        </button>
      )}

      {isCollapsed && isExpanded && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg space-y-1 min-w-[200px]">
          <button
            onClick={onSettingsClick}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isDarkMode 
                ? 'text-slate-300 hover:bg-slate-700 hover:text-white' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm whitespace-nowrap">Settings</span>
          </button>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isDarkMode 
                ? 'text-red-400 hover:bg-slate-700 hover:text-red-300' 
                : 'text-red-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm whitespace-nowrap">Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
