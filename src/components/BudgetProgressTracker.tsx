import { Expense } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

interface BudgetProgressTrackerProps {
  expenses: Expense[];
  currency: string;
}

export function BudgetProgressTracker({ expenses, currency }: BudgetProgressTrackerProps) {
  // Calculate monthly spending
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const totalSpent = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate daily average for this month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const dailyAverage = totalSpent / currentDay;
  const projectedMonthly = dailyAverage * daysInMonth;
  
  // Set budget (could be user-configurable, using a default for now)
  const monthlyBudget = 50000; // Default budget
  const budgetUsed = (totalSpent / monthlyBudget) * 100;
  const projectedBudgetUsed = (projectedMonthly / monthlyBudget) * 100;
  
  const daysRemaining = daysInMonth - currentDay;
  const remainingBudget = monthlyBudget - totalSpent;
  const dailyBudgetRemaining = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          Budget Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex justify-between text-base mb-3">
            <span className="text-slate-600 dark:text-slate-400">Spent this month</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              {formatCurrency(totalSpent)} / {formatCurrency(monthlyBudget)}
            </span>
          </div>
          <Progress value={Math.min(budgetUsed, 100)} className="h-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {budgetUsed.toFixed(0)}% of budget used
          </p>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            {projectedBudgetUsed > 100 ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
            <span className="text-base font-medium text-slate-700 dark:text-slate-300">
              Projected: {formatCurrency(projectedMonthly)}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {daysRemaining} days remaining • {formatCurrency(dailyBudgetRemaining)}/day available
          </p>
        </div>
        
        {budgetUsed > 90 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-base text-amber-800 dark:text-amber-400">
              ⚠️ You've used {budgetUsed.toFixed(0)}% of your budget. Consider reducing spending.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
