import { useState, useMemo } from 'react';
import { Expense } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Calendar, TrendingUp, TrendingDown, Search, X, Clock, Tag, DollarSign } from 'lucide-react';

type TimelineView = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

interface ExpenseTimelineGraphProps {
  expenses: Expense[];
  isDarkMode: boolean;
}

export default function ExpenseTimelineGraph({ expenses, isDarkMode }: ExpenseTimelineGraphProps) {
  const [timelineView, setTimelineView] = useState<TimelineView>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const timelineOptions = [
    { value: '24h' as TimelineView, label: '24 Hours' },
    { value: '7d' as TimelineView, label: '7 Days' },
    { value: '30d' as TimelineView, label: '30 Days' },
    { value: '90d' as TimelineView, label: '90 Days' },
    { value: '1y' as TimelineView, label: '1 Year' },
    { value: 'all' as TimelineView, label: 'All Time' },
  ];

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (timelineView) {
      case '24h':
        cutoffDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return expenses;
      default:
        return expenses;
    }

    return expenses.filter(expense => new Date(expense.date) >= cutoffDate);
  }, [expenses, timelineView]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return expenses.filter(expense => {
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query) ||
        (expense.notes && expense.notes.toLowerCase().includes(query)) ||
        formatDate(expense.date).toLowerCase().includes(query) ||
        expense.amount.toString().includes(query) ||
        formatCurrency(expense.amount).toLowerCase().includes(query)
      );
    });
  }, [expenses, searchQuery]);

  const timelineData = useMemo(() => {
    if (filteredExpenses.length === 0) return [];

    const groupedData: Record<string, number> = {};

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      let key: string;

      switch (timelineView) {
        case '24h':
          key = date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
          break;
        case '7d':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case '30d':
        case '90d':
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case '1y':
          key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          break;
        case 'all':
          key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;
        default:
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      groupedData[key] = (groupedData[key] || 0) + expense.amount;
    });

    return Object.entries(groupedData)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [filteredExpenses, timelineView]);

  const maxAmount = useMemo(() => {
    if (timelineData.length === 0) return 0;
    return Math.max(...timelineData.map(d => d.amount));
  }, [timelineData]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const averageAmount = useMemo(() => {
    if (timelineData.length === 0) return 0;
    return totalAmount / timelineData.length;
  }, [totalAmount, timelineData]);

  const trend = useMemo(() => {
    if (timelineData.length < 2) return null;
    const recent = timelineData.slice(-3).reduce((sum, d) => sum + d.amount, 0);
    const previous = timelineData.slice(-6, -3).reduce((sum, d) => sum + d.amount, 0);
    if (previous === 0) return null;
    return ((recent - previous) / previous) * 100;
  }, [timelineData]);

  const barColor = isDarkMode ? 'from-purple-500 to-cyan-500' : 'from-purple-500 to-cyan-500';
  const bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textColor = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const subTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl shadow-sm`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Expense Timeline
            </h3>
            <p className={`text-sm ${subTextColor} mt-1`}>
              Track your spending over time
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              placeholder="Search expenses by description, category, amount, date, or notes..."
              className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
              } focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Timeline Selector */}
        <div className="flex flex-wrap gap-2">
          {timelineOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimelineView(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timelineView === option.value
                  ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <p className={`text-sm ${subTextColor}`}>Total</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div>
          <p className={`text-sm ${subTextColor}`}>Average</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
            {formatCurrency(averageAmount)}
          </p>
        </div>
        <div>
          <p className={`text-sm ${subTextColor}`}>Transactions</p>
          <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
            {filteredExpenses.length}
          </p>
        </div>
      </div>

      {/* Trend Indicator */}
      {trend !== null && (
        <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 ${
          trend > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
        }`}>
          {trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-rose-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          )}
          <span className={`text-sm font-medium ${
            trend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {trend > 0 ? 'Spending increased' : 'Spending decreased'} by {Math.abs(trend).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Graph */}
      <div className="p-6">
        {showSearchResults && searchQuery ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className={`text-sm font-semibold ${textColor}`}>
                Search Results ({searchResults.length})
              </h4>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className={textColor}>No expenses found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {searchResults.map((expense) => (
                  <div
                    key={expense.id}
                    className={`p-4 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-slate-700/50 border-slate-600' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className={`font-semibold text-slate-800 dark:text-white mb-1`}>
                          {expense.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={`flex items-center gap-1 ${subTextColor}`}>
                            <Tag className="w-3 h-3" />
                            {expense.category}
                          </span>
                          <span className={`flex items-center gap-1 ${subTextColor}`}>
                            <Clock className="w-3 h-3" />
                            {formatDate(expense.date)}
                          </span>
                          <span className={`flex items-center gap-1 ${subTextColor}`}>
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expense.notes && (
                      <div className={`mt-2 p-2 rounded text-xs ${
                        isDarkMode 
                          ? 'bg-slate-800 text-slate-300' 
                          : 'bg-white text-slate-600'
                      }`}>
                        <p className="whitespace-pre-wrap">{expense.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : timelineData.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className={textColor}>No expenses for this time period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timelineData.map((data, index) => {
              const percentage = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${textColor}`}>{data.label}</span>
                    <span className={`text-sm font-bold text-slate-800 dark:text-white`}>
                      {formatCurrency(data.amount)}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
