import { Insight } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertCircle, Lightbulb, Info, RefreshCw, X, ChevronDown, ChevronUp, TrendingUp, Shield, Target } from 'lucide-react';
import { useState } from 'react';

interface InsightsPanelProps {
  insights: Insight[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const insightStyles = {
  warning: {
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    Icon: AlertCircle,
    badge: 'bg-amber-500 text-white',
    badgeText: 'Alert'
  },
  tip: {
    bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    Icon: Lightbulb,
    badge: 'bg-emerald-500 text-white',
    badgeText: 'Tip'
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    Icon: Info,
    badge: 'bg-blue-500 text-white',
    badgeText: 'Info'
  }
};

const insightIcons = {
  '💰': TrendingUp,
  '💵': TrendingUp,
  '📈': TrendingUp,
  '🏆': Target,
  '🛡️': Shield,
  '🔒': Shield,
  '🎯': Target,
};

export function InsightsPanel({ insights, onRefresh, isRefreshing }: InsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<number>>(new Set());
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());

  if (insights.length === 0) {
    return null;
  }

  const visibleInsights = insights.filter((_, index) => !dismissedInsights.has(index));

  const handleDismiss = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedInsights(prev => new Set([...prev, index]));
  };

  const handleToggleExpand = (index: number) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getPriorityOrder = (type: string) => {
    if (type === 'warning') return 0;
    if (type === 'tip') return 1;
    return 2;
  };

  const sortedInsights = [...visibleInsights].sort((a, b) => 
    getPriorityOrder(a.type) - getPriorityOrder(b.type)
  );

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold text-slate-800 dark:text-white flex items-center gap-3">
            <span className="text-3xl animate-pulse">🧠</span>
            <div>
              AI Insights
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                {visibleInsights.length} personalized recommendation{visibleInsights.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardTitle>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              title="Refresh insights"
            >
              <RefreshCw className={`w-6 h-6 text-slate-600 dark:text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {sortedInsights.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>All insights dismissed. Refresh to see new recommendations.</p>
          </div>
        ) : (
          sortedInsights.map((insight, originalIndex) => {
            const actualIndex = insights.indexOf(insight);
            const style = insightStyles[insight.type];
            const IconComponent = style.Icon;
            const isExpanded = expandedInsights.has(actualIndex);
            const CustomIcon = insightIcons[insight.icon as keyof typeof insightIcons];
            
            return (
              <div
                key={actualIndex}
                className={`group relative overflow-hidden rounded-xl border-2 ${style.border} ${style.bg} transition-all duration-300 hover:shadow-md hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-4 p-5">
                  <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center`}>
                    {insight.icon && !CustomIcon ? (
                      <span className="text-2xl">{insight.icon}</span>
                    ) : CustomIcon ? (
                      <CustomIcon className={`w-6 h-6 ${style.icon}`} />
                    ) : (
                      <IconComponent className={`w-6 h-6 ${style.icon}`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                          {style.badgeText}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(actualIndex, e)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transitionopacity opacity-0 group-hover:opacity-100"
                        title="Dismiss insight"
                      >
                        <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                      </button>
                    </div>
                    
                    <p className={`text-base text-slate-700 dark:text-slate-200 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                      {insight.message}
                    </p>
                    
                    {insight.message.length > 150 && (
                      <button
                        onClick={() => handleToggleExpand(actualIndex)}
                        className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Show more <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent opacity-50" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}