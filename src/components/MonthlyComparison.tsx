import { Expense } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

interface MonthlyComparisonProps {
  expenses: Expense[];
  currency: string;
}

export function MonthlyComparison({ expenses, currency }: MonthlyComparisonProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Get last 3 months data
  const months = [];
  for (let i = 2; i >= 0; i--) {
    const month = currentMonth - i;
    const year = month < 0 ? currentYear - 1 : currentYear;
    const adjustedMonth = month < 0 ? month + 12 : month;
    
    const monthExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date.getMonth() === adjustedMonth && date.getFullYear() === year;
    }).reduce((sum, e) => sum + e.amount, 0);
    
    const monthName = new Date(year, adjustedMonth).toLocaleString('default', { month: 'short' });
    months.push({ name: monthName, amount: monthExpenses });
  }
  
  // Calculate trend
  const currentAmount = months[2].amount;
  const previousAmount = months[1].amount;
  const trend = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
  
  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Monthly Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {months.map((month, index) => (
            <div key={index} className="min-w-0 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{month.name}</p>
              <p className="text-[clamp(0.9rem,1.25vw,1.125rem)] leading-tight font-semibold text-slate-800 dark:text-white tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                {formatCurrency(month.amount, currency)}
              </p>
            </div>
          ))}
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-base text-slate-600 dark:text-slate-400">vs last month</span>
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-500" />
              ) : trend < 0 ? (
                <TrendingDown className="w-5 h-5 text-emerald-500" />
              ) : (
                <Minus className="w-5 h-5 text-slate-400" />
              )}
              <span className={`text-lg font-semibold ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                {Math.abs(trend).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
