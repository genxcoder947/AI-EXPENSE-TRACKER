import { Expense, Income } from '../types';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

interface QuickSummaryProps {
  expenses: Expense[];
  income: Income[];
  currency: string;
}

export function QuickSummary({ expenses, income, currency }: QuickSummaryProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : '0';
  
  // Calculate this month's expenses
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate last month's expenses for comparison
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const monthOverMonthChange = lastMonthExpenses > 0 
    ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
    : 0;

  return (
    <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Quick Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="text-sm text-white/80">Total Income</span>
            </div>
            <p className="text-[clamp(1rem,1.45vw,1.5rem)] leading-tight font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
              {formatCurrency(totalIncome, currency)}
            </p>
          </div>
          
          <div className="min-w-0 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 shrink-0" />
              <span className="text-sm text-white/80">Net Savings</span>
            </div>
            <p className={`text-[clamp(1rem,1.45vw,1.5rem)] leading-tight font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis ${netSavings >= 0 ? 'text-white' : 'text-red-200'}`}>
              {formatCurrency(netSavings, currency)}
            </p>
          </div>
          
          <div className="min-w-0 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-white/80">Savings Rate</span>
            </div>
            <p className="text-[clamp(1.25rem,1.8vw,1.75rem)] leading-tight font-bold tabular-nums">{savingsRate}%</p>
          </div>
          
          <div className="min-w-0 bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              {monthOverMonthChange > 0 ? (
                <TrendingUp className="w-4 h-4 shrink-0" />
              ) : (
                <TrendingDown className="w-4 h-4 shrink-0" />
              )}
              <span className="text-sm text-white/80">MoM Change</span>
            </div>
            <p className={`text-[clamp(1.25rem,1.8vw,1.75rem)] leading-tight font-bold tabular-nums ${monthOverMonthChange > 0 ? 'text-red-200' : 'text-white'}`}>
              {Math.abs(monthOverMonthChange).toFixed(0)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
