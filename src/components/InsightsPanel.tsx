import { Insight } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Lightbulb, Info } from 'lucide-react';

interface InsightsPanelProps {
  insights: Insight[];
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

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-xl">🧠</span>
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {insights.map((insight, index) => {
          const style = insightStyles[insight.type];
          const IconComponent = style.Icon;
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border}`}
            >
              <IconComponent className={`w-5 h-5 mt-0.5 ${style.icon} flex-shrink-0`} />
              <p className="text-sm text-slate-700 leading-relaxed">{insight.message}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}