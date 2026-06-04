import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, DollarSign, BarChart3, TrendingUp, Settings } from 'lucide-react';

interface QuickActionsProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onViewAnalytics: () => void;
  onViewInsights: () => void;
  onSettings: () => void;
}

export function QuickActions({ onAddExpense, onAddIncome, onViewAnalytics, onViewInsights, onSettings }: QuickActionsProps) {
  const actions = [
    { icon: Plus, label: 'Add Expense', onClick: onAddExpense, color: 'bg-emerald-500 hover:bg-emerald-600' },
    { icon: DollarSign, label: 'Add Income', onClick: onAddIncome, color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: BarChart3, label: 'Analytics', onClick: onViewAnalytics, color: 'bg-purple-500 hover:bg-purple-600' },
    { icon: TrendingUp, label: 'Insights', onClick: onViewInsights, color: 'bg-teal-500 hover:bg-teal-600' },
    { icon: Settings, label: 'Settings', onClick: onSettings, color: 'bg-slate-500 hover:bg-slate-600' },
  ];

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-white">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg ${action.color} text-white transition-colors`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
