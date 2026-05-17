import { useMemo, useState } from 'react';
import { Expense } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ArrowUpRight, Calendar, Sparkles, TrendingUp, X } from 'lucide-react';

interface StatsOverviewProps {
  expenses: Expense[];
}

type StatDetail = 'total' | 'month' | 'ai';

const detailTitles: Record<StatDetail, string> = {
  total: 'Total spent details',
  month: 'This month details',
  ai: 'AI categorized details',
};

export function StatsOverview({ expenses }: StatsOverviewProps) {
  const [activeDetail, setActiveDetail] = useState<StatDetail | null>(null);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const thisMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const aiCategorizedExpenses = expenses.filter(e => e.aiSuggested);
  const aiCategorizedCount = aiCategorizedExpenses.length;

  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.forEach((expense) => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
    });

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
  }, [expenses]);

  const detailExpenses =
    activeDetail === 'month'
      ? thisMonthExpenses
      : activeDetail === 'ai'
        ? aiCategorizedExpenses
        : expenses;

  const detailTotal = detailExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const detailAverage = detailExpenses.length > 0 ? detailTotal / detailExpenses.length : 0;

  const statCards = [
    {
      id: 'total' as const,
      label: 'Total Spent',
      value: formatCurrency(totalSpent),
      helper: topCategory ? `Top category: ${topCategory[0]}` : 'No spending yet',
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-100',
    },
    {
      id: 'month' as const,
      label: 'This Month',
      value: formatCurrency(thisMonthTotal),
      helper: `${thisMonthExpenses.length} expenses this month`,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-100',
    },
    {
      id: 'ai' as const,
      label: 'AI Categorized',
      value: String(aiCategorizedCount),
      helper: `${expenses.length > 0 ? Math.round((aiCategorizedCount / expenses.length) * 100) : 0}% of all expenses`,
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-100',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => setActiveDetail(stat.id)}
              className="text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-label={`Open ${stat.label} details`}
            >
              <Card className={`bg-gradient-to-br ${stat.color} border-0 shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`${stat.textColor} text-sm font-medium`}>{stat.label}</p>
                      <p className="text-3xl font-bold text-white mt-1 truncate">{stat.value}</p>
                      <p className="mt-2 text-xs text-white/80">{stat.helper}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex shrink-0 items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-white/90">
                    View details
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {activeDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-800 p-5 shadow-xl text-slate-900 dark:text-slate-100">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{detailTitles[activeDetail]}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {detailExpenses.length} expense{detailExpenses.length === 1 ? '' : 's'} · {formatCurrency(detailTotal)} total · {formatCurrency(detailAverage)} average
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailExpenses.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No expenses match this option yet.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                {detailExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{expense.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {expense.category} · {formatDate(expense.date)}
                      </p>
                      {expense.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{expense.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</p>
                      {expense.aiSuggested && (
                        <p className="mt-1 text-xs font-medium text-emerald-600">AI categorized</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
