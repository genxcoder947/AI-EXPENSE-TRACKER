import { CategoryTotal } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../utils/helpers';

interface SpendingChartProps {
  categoryTotals: CategoryTotal[];
}

export function SpendingChart({ categoryTotals }: SpendingChartProps) {
  if (categoryTotals.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {categoryTotals.slice(0, 5).map((cat, index) => (
            <div key={cat.category} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                <span className="text-sm font-semibold text-slate-800">{formatCurrency(cat.total)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">{cat.percentage.toFixed(1)}% of total</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}