import { Expense, Income } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Target, Trophy, Star } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

interface SavingsGoalProgressProps {
  expenses: Expense[];
  income: Income[];
  currency: string;
}

export function SavingsGoalProgress({ expenses, income, currency }: SavingsGoalProgressProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  
  // Define savings goals
  const goals = [
    { name: 'Emergency Fund', target: 100000, icon: '🛡️' },
    { name: 'Vacation', target: 50000, icon: '🏝️' },
    { name: 'New Phone', target: 30000, icon: '📱' },
    { name: 'Investment', target: 100000, icon: '📈' }
  ];
  
  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <Target className="w-5 h-5" />
          Savings Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-5 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-medium text-emerald-900 dark:text-emerald-400">Total Savings</span>
            <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">
              {formatCurrency(netSavings)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <Trophy className="w-4 h-4" />
            <span>Keep building your savings!</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {goals.map((goal, index) => {
            const progress = Math.min((netSavings / goal.target) * 100, 100);
            const achieved = netSavings >= goal.target;
            
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xl">{goal.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{goal.name}</span>
                    {achieved && <Star className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${achieved ? 'bg-emerald-500' : 'bg-teal-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {progress.toFixed(0)}% of {formatCurrency(goal.target)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
