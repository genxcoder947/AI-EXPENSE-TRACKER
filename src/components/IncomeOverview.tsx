import { useMemo, useState } from 'react';
import { Income } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ArrowUpRight, Calendar, Sparkles, TrendingUp, X, DollarSign, Target, PiggyBank } from 'lucide-react';

interface IncomeOverviewProps {
  income: Income[];
  currency: string;
}

type StatDetail = 'total' | 'month' | 'category';

const detailTitles: Record<StatDetail, string> = {
  total: 'Total income details',
  month: 'This month details',
  category: 'Top category details',
};

export function IncomeOverview({ income, currency }: IncomeOverviewProps) {
  const [activeDetail, setActiveDetail] = useState<StatDetail | null>(null);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  
  const thisMonthIncome = income.filter(i => {
    const incomeDate = new Date(i.date);
    const now = new Date();
    return incomeDate.getMonth() === now.getMonth() && incomeDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthIncome.reduce((sum, i) => sum + i.amount, 0);
  
  const topCategory = useMemo(() => {
    const totals = new Map<string, number>();
    income.forEach((inc) => {
      totals.set(inc.category, (totals.get(inc.category) || 0) + inc.amount);
    });

    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
  }, [income]);

  const averageIncome = income.length > 0 ? totalIncome / income.length : 0;
  const monthlyAverage = thisMonthIncome.length > 0 ? thisMonthTotal / thisMonthIncome.length : 0;

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: string[] = [];
    
    if (income.length === 0) {
      insights.push("Start tracking your income to get AI-powered insights!");
      return insights;
    }

    // Income trend analysis
    if (thisMonthTotal > 0) {
      const previousMonthIncome = income.filter(i => {
        const incomeDate = new Date(i.date);
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return incomeDate.getMonth() === prevMonth.getMonth() && incomeDate.getFullYear() === prevMonth.getFullYear();
      });
      const previousMonthTotal = previousMonthIncome.reduce((sum, i) => sum + i.amount, 0);
      
      if (previousMonthTotal > 0) {
        const growth = ((thisMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
        if (growth > 10) {
          insights.push(`🚀 Great! Your income increased by ${growth.toFixed(1)}% compared to last month.`);
        } else if (growth < -10) {
          insights.push(`📉 Your income decreased by ${Math.abs(growth).toFixed(1)}% compared to last month. Consider reviewing your income sources.`);
        }
      }
    }

    // Category diversity
    const uniqueCategories = new Set(income.map(i => i.category)).size;
    if (uniqueCategories >= 3) {
      insights.push(`💡 You have diverse income sources across ${uniqueCategories} categories. This is good for financial stability.`);
    } else if (uniqueCategories === 1) {
      insights.push(`⚠️ You rely on a single income source. Consider diversifying your income for better financial security.`);
    }

    // Income consistency
    if (income.length >= 3) {
      const amounts = income.map(i => i.amount);
      const variance = Math.abs(amounts[0] - amounts[amounts.length - 1]) / amounts[0];
      if (variance < 0.1) {
        insights.push(`✅ Your income is consistent, which is great for financial planning.`);
      } else if (variance > 0.5) {
        insights.push(`📊 Your income varies significantly. Consider building an emergency fund for stability.`);
      }
    }

    // Savings potential
    if (averageIncome > 0) {
      const suggestedSavings = averageIncome * 0.2; // 20% savings rule
      insights.push(`💰 Based on your average income, aim to save ${formatCurrency(suggestedSavings, currency)} per income entry (20% rule).`);
    }

    return insights;
  }, [income, thisMonthTotal, currency]);

  const detailIncome =
    activeDetail === 'month'
      ? thisMonthIncome
      : activeDetail === 'category'
        ? income.filter(i => i.category === topCategory?.[0])
        : income;

  const detailTotal = detailIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const detailAverage = detailIncome.length > 0 ? detailTotal / detailIncome.length : 0;

  const statCards = [
    {
      id: 'total' as const,
      label: 'Total Income',
      value: formatCurrency(totalIncome, currency),
      helper: `Average: ${formatCurrency(averageIncome, currency)} per entry`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-100',
    },
    {
      id: 'month' as const,
      label: 'This Month',
      value: formatCurrency(thisMonthTotal, currency),
      helper: `${thisMonthIncome.length} income entries this month`,
      icon: Calendar,
      color: 'from-cyan-500 to-cyan-600',
      textColor: 'text-cyan-100',
    },
    {
      id: 'category' as const,
      label: 'Top Source',
      value: topCategory ? topCategory[0] : 'N/A',
      helper: topCategory ? formatCurrency(topCategory[1], currency) : 'No income yet',
      icon: Target,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-100',
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
              className="text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
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

      {/* AI Insights Section */}
      {aiInsights.length > 0 && (
        <Card className="mt-4 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-slate-800 dark:text-white">AI Income Insights</h3>
            </div>
            <div className="space-y-2">
              {aiInsights.map((insight, index) => (
                <p key={index} className="text-sm text-slate-700 dark:text-slate-300">
                  {insight}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  {detailIncome.length} income entr{detailIncome.length === 1 ? 'y' : 'ies'} · {formatCurrency(detailTotal, currency)} total · {formatCurrency(detailAverage, currency)} average
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

            {detailIncome.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No income entries match this option yet.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
                {detailIncome.map((inc) => (
                  <div key={inc.id} className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{inc.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {inc.category} · {formatDate(inc.date)}
                      </p>
                      {inc.notes && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{inc.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(inc.amount, currency)}</p>
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
