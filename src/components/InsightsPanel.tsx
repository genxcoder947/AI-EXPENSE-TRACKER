import { Insight } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Lightbulb, Info, RefreshCw } from 'lucide-react';

interface InsightsPanelProps {
  insights: Insight[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const insightStyles = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    Icon: AlertCircle
  },
  tip: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    Icon: Lightbulb
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    Icon: Info
  }
};

export function InsightsPanel({ insights, onRefresh, isRefreshing }: InsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            AI Insights
          </CardTitle>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh insights"
            >
              <RefreshCw className={`w-6 h-6 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {insights.map((insight, index) => {
          const style = insightStyles[insight.type];
          const IconComponent = style.Icon;
          return (
            <div
              key={index}
              className={`flex items-start gap-4 p-5 rounded-lg ${style.bg} border ${style.border}`}
            >
              <IconComponent className={`w-6 h-6 mt-0.5 ${style.icon} flex-shrink-0`} />
              <p className="text-base text-slate-700 leading-relaxed">{insight.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}