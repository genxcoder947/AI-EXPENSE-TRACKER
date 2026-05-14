export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  aiSuggested: boolean;
}

export interface AiSuggestion {
  category: string;
  confidence: number;
  reason: string;
  action: string;
  signals: string[];
}

export interface CategoryTotal {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

export interface Insight {
  type: 'warning' | 'tip' | 'info';
  message: string;
  icon: string;
}
