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
      <CardContent className="p-8">
        <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Target className="w-6 h-6" />
          Quick Summary
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5" />
              <span className="text-sm text-white/80">Total Income</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5" />
              <span className="text-sm text-white/80">Net Savings</span>
            </div>
            <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-white' : 'text-red-200'}`}>
              {formatCurrency(netSavings)}
            </p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-white/80">Savings Rate</span>
            </div>
            <p className="text-2xl font-bold">{savingsRate}%</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              {monthOverMonthChange > 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="text-sm text-white/80">MoM Change</span>
            </div>
            <p className={`text-2xl font-bold ${monthOverMonthChange > 0 ? 'text-red-200' : 'text-white'}`}>
              {Math.abs(monthOverMonthChange).toFixed(0)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
