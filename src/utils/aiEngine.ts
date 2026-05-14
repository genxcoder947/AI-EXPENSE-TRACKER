import { Expense, CategoryTotal, Insight, AiSuggestion } from '../types';

const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': ['restaurant', 'coffee', 'groceries', 'lunch', 'dinner', 'breakfast', 'cafe', 'pizza', 'sushi', 'burger', 'meal', 'snack', 'doordash', 'uber eats', 'grubhub', 'zomato', 'swiggy', 'blinkit', 'zepto', 'bigbasket', 'instamart', 'starbucks', 'dominos', 'mcdonald', 'kfc', 'subway', 'chai', 'tea', 'bakery'],
  'Transportation': ['uber', 'ola', 'lyft', 'rapido', 'gas', 'fuel', 'petrol', 'diesel', 'parking', 'car', 'bus', 'train', 'metro', 'taxi', 'cab', 'auto', 'vehicle', 'toll', 'fastag'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'target', 'walmart', 'clothes', 'shoes', 'electronics', 'store', 'mall', 'retail', 'order', 'purchase', 'ikea', 'nykaa'],
  'Entertainment': ['netflix', 'spotify', 'movie', 'concert', 'game', 'hulu', 'disney', 'youtube', 'theater', 'show', 'subscription', 'prime video', 'hotstar', 'bookmyshow', 'playstation', 'xbox'],
  'Bills & Utilities': ['electric', 'electricity', 'water', 'internet', 'wifi', 'broadband', 'phone', 'mobile', 'utility', 'bill', 'insurance', 'rent', 'mortgage', 'airtel', 'jio', 'vi', 'bsnl', 'recharge', 'emi'],
  'Healthcare': ['pharmacy', 'doctor', 'hospital', 'medicine', 'dental', 'medical', 'health', 'clinic', 'apollo', 'diagnostic', 'lab test'],
  'Education': ['course', 'book', 'tuition', 'school', 'university', 'learning', 'udemy', 'coursera', 'skillshare', 'exam', 'certification'],
  'Travel': ['hotel', 'airbnb', 'vacation', 'trip', 'booking', 'resort', 'travel', 'flight', 'airline', 'indigo', 'makemytrip', 'goibibo', 'irctc'],
};

const categoryActions: Record<string, string> = {
  'Food & Dining': 'Set a weekly eating-out cap and mark groceries separately so you can see which habit is driving food spend.',
  'Transportation': 'Compare this with your usual commute cost; repeated cab or fuel entries are good candidates for a monthly travel budget.',
  'Shopping': 'Wait 24 hours before similar non-essential purchases and group online orders to avoid impulse spend.',
  'Entertainment': 'Check whether this is a recurring subscription and cancel or pause anything you have not used this month.',
  'Bills & Utilities': 'Treat this as a fixed bill and add a due-date reminder so late fees do not quietly increase the total.',
  'Healthcare': 'Keep the receipt for reimbursement or tax records, and track medicine separately from consultations if it repeats.',
  'Education': 'Log this as a skill investment and review whether similar courses/books are being fully used before buying more.',
  'Travel': 'Tag trip-related costs consistently so you can compare the full trip total against your planned budget.',
  Other: 'Add one or two more words, such as merchant and purpose, and the assistant can classify it more accurately.',
};

const tokenize = (description: string) =>
  description
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export const suggestCategory = (description: string): AiSuggestion => {
  const lowerDesc = description.toLowerCase();
  const tokens = tokenize(description);
  const tokenSet = new Set(tokens);
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => {
    const matched = keywords.filter((keyword) => {
      if (keyword.includes(' ')) {
        return lowerDesc.includes(keyword);
      }
      return tokenSet.has(keyword) || lowerDesc.includes(keyword);
    });
    const exactMerchantBoost = matched.some((keyword) => keyword.length > 5) ? 0.14 : 0;
    const score = matched.length * 0.18 + exactMerchantBoost;

    return { category, matched, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const runnerUp = scores[1];

  if (!best || best.matched.length === 0) {
    return {
      category: 'Other',
      confidence: 0.45,
      reason: 'I could not find a strong merchant or spending-purpose signal yet.',
      action: categoryActions.Other,
      signals: [],
    };
  }

  const scoreGap = Math.max(0, best.score - (runnerUp?.score ?? 0));
  const confidence = Math.min(0.96, 0.62 + best.matched.length * 0.08 + scoreGap * 0.35);
  const signalList = best.matched.slice(0, 3);

  return {
    category: best.category,
    confidence,
    reason: `Matched ${signalList.map((signal) => `"${signal}"`).join(', ')} to ${best.category.toLowerCase()}.`,
    action: categoryActions[best.category],
    signals: signalList,
  };
};

export const generateInsights = (expenses: Expense[]): Insight[] => {
  const insights: Insight[] = [];
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Category analysis
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });
  
  // Find highest spending category
  const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (highestCategory && highestCategory[1] > totalSpent * 0.4) {
    insights.push({
      type: 'warning',
      message: `You're spending ${Math.round((highestCategory[1] / totalSpent) * 100)}% on ${highestCategory[0]}. Consider setting a budget limit.`,
      icon: '⚠️'
    });
  }
  
  // Recent spending trend
  const recentExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return expenseDate > weekAgo;
  });
  
  const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dailyAverage = recentTotal / 7;
  
  insights.push({
    type: 'info',
    message: `Your daily average this week is ₹${dailyAverage.toFixed(2)}. At this rate, you'll spend ₹${(dailyAverage * 30).toFixed(0)} this month.`,
    icon: '📊'
  });
  
  // Smart tip
  if (categoryTotals['Food & Dining'] > 200) {
    insights.push({
      type: 'tip',
      message: 'Meal prepping could save you up to 40% on food expenses. Consider planning your meals for the week.',
      icon: '💡'
    });
  }
  
  if (categoryTotals['Entertainment'] > 100) {
    insights.push({
      type: 'tip',
      message: 'Review your subscriptions - you might be paying for services you rarely use.',
      icon: '💡'
    });
  }
  
  return insights;
};

export const calculateCategoryTotals = (expenses: Expense[]): CategoryTotal[] => {
  const totals: Record<string, number> = {};
  expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  });
  
  const total = Object.values(totals).reduce((sum, t) => sum + t, 0);
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500', 'bg-gray-500'];
  
  return Object.entries(totals)
    .map(([category, amount], index) => ({
      category,
      total: amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.total - a.total);
};
