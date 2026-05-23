import { Expense, CategoryTotal, Insight, AiSuggestion } from '../types';

const categoryKeywords: Record<string, string[]> = {
  'Food & Dining': [
    // Meals
    'breakfast', 'lunch', 'dinner', 'meal', 'snack', 'brunch', 'supper',
    // Common food items
    'bread', 'omelette', 'omelet', 'egg', 'eggs', 'rice', 'dal', 'curry', 'roti', 'chapati', 'naan', 'paratha',
    'pasta', 'noodles', 'soup', 'salad', 'sandwich', 'burger', 'pizza', 'sushi',
    'chicken', 'mutton', 'fish', 'meat', 'beef', 'pork', 'seafood', 'prawn', 'shrimp',
    // Indian dishes
    'biryani', 'idli', 'dosa', 'sambar', 'vada', 'uttapam', 'poha', 'upma',
    'khichdi', 'pulao', 'fried rice', 'thali', 'curd', 'yogurt',
    'paneer', 'tofu', 'vegetable', 'veg', 'non-veg',
    // Beverages
    'coffee', 'tea', 'chai', 'milk', 'juice', 'shake', 'smoothie', 'soda', 'water',
    'latte', 'cappuccino', 'espresso', 'mojito', 'cocktail', 'beer', 'wine',
    // Ingredients
    'butter', 'cheese', 'cream', 'milk', 'oil', 'ghee', 'spice', 'salt', 'sugar',
    'flour', 'atta', 'vegetables', 'fruits', 'onion', 'tomato', 'potato',
    // Food venues
    'restaurant', 'cafe', 'bakery', 'bistro', 'diner', 'eatery', 'food court', 'canteen', 'mess',
    // Delivery apps
    'doordash', 'uber eats', 'grubhub', 'zomato', 'swiggy', 'blinkit', 'zepto', 'bigbasket', 'instamart',
    // Fast food chains
    'starbucks', 'dominos', 'mcdonald', 'kfc', 'subway', 'pizza hut', 'burger king',
    // Grocery
    'groceries', 'grocery', 'supermarket', 'store', 'market', 'shop',
    // Desserts
    'cake', 'pastry', 'ice cream', 'chocolate', 'sweet', 'dessert', 'candy',
    // Cooking
    'cook', 'cooking', 'recipe', 'kitchen', 'food',
  ],
  'Transportation': [
    'uber', 'ola', 'lyft', 'rapido', 'taxi', 'cab', 'auto', 'rickshaw',
    'gas', 'fuel', 'petrol', 'diesel', 'cng', 'parking', 'toll', 'fastag',
    'car', 'bike', 'motorcycle', 'scooter', 'bus', 'train', 'metro', 'subway',
    'flight', 'airline', 'airport', 'travel', 'trip', 'journey', 'commute',
    'vehicle', 'transport', 'ride', 'drive', 'wheel', 'tire', 'service',
    'ticket', 'pass', 'booking', 'reservation',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq',
    'target', 'walmart', 'best buy', 'costco',
    'clothes', 'clothing', 'shirt', 'pants', 'dress', 'jeans', 't-shirt', 'jacket',
    'shoes', 'footwear', 'sneakers', 'sandals', 'boots',
    'electronics', 'gadget', 'phone', 'laptop', 'tablet', 'headphone', 'speaker',
    'store', 'mall', 'shop', 'retail', 'outlet', 'supermarket',
    'order', 'purchase', 'buy', 'cart', 'checkout', 'delivery',
    'furniture', 'home', 'decor', 'ikea',
    'cosmetics', 'makeup', 'beauty', 'skincare',
    'jewelry', 'accessory', 'watch', 'bag', 'purse',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'amazon prime', 'disney+', 'hotstar', 'hulu', 'hbo',
    'youtube', 'youtube premium', 'apple music',
    'movie', 'film', 'cinema', 'theater', 'show', 'concert', 'event',
    'game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'epic',
    'subscription', 'membership', 'premium',
    'bookmyshow', 'ticket', 'booking', 'showtime',
    'book', 'novel', 'magazine', 'comic', 'kindle',
    'sports', 'match', 'cricket', 'football', 'basketball',
  ],
  'Bills & Utilities': [
    'electric', 'electricity', 'power', 'energy',
    'water', 'sewer', 'garbage',
    'internet', 'wifi', 'broadband', 'data', 'connection',
    'phone', 'mobile', 'cellular', 'landline', 'sim',
    'utility', 'bill', 'invoice', 'payment', 'due',
    'insurance', 'premium', 'policy',
    'rent', 'lease', 'mortgage', 'emi', 'loan',
    'airtel', 'jio', 'vi', 'bsnl', 'recharge', 'topup',
    'gas', 'lpg', 'cylinder', 'pipeline',
    'cable', 'tv', 'dth', 'set-top box',
    'maintenance', 'repair', 'service',
  ],
  'Healthcare': [
    'pharmacy', 'drugstore', 'chemist', 'medicine', 'drug', 'medication', 'pill',
    'doctor', 'physician', 'surgeon', 'specialist', 'consultant',
    'hospital', 'clinic', 'nursing home', 'medical center',
    'dental', 'dentist', 'orthodontist',
    'medical', 'health', 'wellness', 'fitness',
    'apollo', 'practo', '1mg', 'netmeds',
    'diagnostic', 'lab test', 'blood test', 'x-ray', 'mri', 'scan',
    'insurance', 'policy', 'claim', 'coverage',
    'vitamin', 'supplement', 'nutrition',
    'therapy', 'treatment', 'surgery', 'operation',
    'gym', 'yoga', 'trainer', 'coach',
  ],
  'Education': [
    'course', 'class', 'lesson', 'tutorial', 'workshop',
    'book', 'textbook', 'ebook', 'study material',
    'tuition', 'fees', 'admission', 'enrollment',
    'school', 'college', 'university', 'institute', 'academy',
    'learning', 'education', 'training', 'certification',
    'udemy', 'coursera', 'skillshare', 'edx', 'pluralsight',
    'exam', 'test', 'quiz', 'assessment',
    'degree', 'diploma', 'certificate',
    'online', 'distance', 'remote',
    'skill', 'development', 'coaching',
  ],
  'Travel': [
    'hotel', 'motel', 'resort', 'hostel', 'airbnb', 'booking',
    'vacation', 'holiday', 'trip', 'tour', 'travel',
    'flight', 'airline', 'airport', 'indigo', 'spicejet', 'air india',
    'train', 'railway', 'irctc', 'rail', 'station',
    'bus', 'volvo', 'ac bus',
    'cab', 'taxi', 'rental car', 'self drive',
    'makemytrip', 'goibibo', 'cleartrip', 'yatra',
    'visa', 'passport', 'ticket', 'reservation',
    'sightseeing', 'tourism', 'excursion',
    'cruise', 'ferry',
  ],
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
    const matched: string[] = [];
    
    keywords.forEach((keyword) => {
      // Exact match for multi-word keywords
      if (keyword.includes(' ')) {
        if (lowerDesc.includes(keyword)) {
          matched.push(keyword);
        }
        return;
      }
      
      // Single keyword matching with improved logic
      const keywordLower = keyword.toLowerCase();
      
      // Direct token match
      if (tokenSet.has(keywordLower)) {
        matched.push(keyword);
        return;
      }
      
      // Partial word match (e.g., "bread" matches "bread")
      if (lowerDesc.includes(keywordLower)) {
        matched.push(keyword);
        return;
      }
      
      // Word boundary matching
      const wordBoundaryRegex = new RegExp(`\\b${keywordLower}\\b`, 'i');
      if (wordBoundaryRegex.test(lowerDesc)) {
        matched.push(keyword);
        return;
      }
      
      // Fuzzy matching for similar words (e.g., "omelette" matches "omelet")
      if (keywordLower.length > 3) {
        const similarity = calculateSimilarity(keywordLower, lowerDesc);
        if (similarity > 0.7) {
          matched.push(keyword);
        }
      }
    });
    
    // Calculate score with improved weighting
    const exactMerchantBoost = matched.some((keyword) => keyword.length > 5) ? 0.15 : 0;
    const foodBoost = category === 'Food & Dining' ? 0.05 : 0; // Slight boost for food category
    const matchScore = matched.length * 0.20; // Increased from 0.18
    const score = matchScore + exactMerchantBoost + foodBoost;

    return { category, matched, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const runnerUp = scores[1];

  // Lower threshold for better categorization
  if (!best || best.matched.length === 0) {
    return {
      category: 'Other',
      confidence: 0.35, // Reduced from 0.45 to be less confident when uncertain
      reason: 'I could not find a strong merchant or spending-purpose signal yet.',
      action: categoryActions.Other,
      signals: [],
    };
  }

  const scoreGap = Math.max(0, best.score - (runnerUp?.score ?? 0));
  const confidence = Math.min(0.97, 0.65 + best.matched.length * 0.07 + scoreGap * 0.30);
  const signalList = best.matched.slice(0, 3);

  return {
    category: best.category,
    confidence,
    reason: `Matched ${signalList.map((signal) => `"${signal}"`).join(', ')} to ${best.category.toLowerCase()}.`,
    action: categoryActions[best.category],
    signals: signalList,
  };
};

// Simple similarity calculation for fuzzy matching
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export const generateInsights = (expenses: Expense[]): Insight[] => {
  const insights: Insight[] = [];
  
  if (expenses.length === 0) {
    return [{
      type: 'info',
      message: 'Start tracking your expenses to unlock AI-powered insights and personalized recommendations.',
      icon: '🚀'
    }];
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Advanced Category Analysis
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  
  // Spending velocity analysis
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstExpense = sortedExpenses[0];
  const lastExpense = sortedExpenses[sortedExpenses.length - 1];
  const daysSpan = Math.max(1, Math.ceil((new Date(lastExpense.date).getTime() - new Date(firstExpense.date).getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAverage = totalSpent / daysSpan;
  
  // Predictive analytics - monthly projection
  const monthlyProjection = dailyAverage * 30;
  insights.push({
    type: 'info',
    message: `Based on your spending velocity of ₹${dailyAverage.toFixed(2)}/day, you're projected to spend ₹${monthlyProjection.toFixed(0)} this month.`,
    icon: '📈'
  });
  
  // Category concentration analysis
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = categoryEntries[0];
  const topCategoryPercentage = (topCategory[1] / totalSpent) * 100;
  
  if (topCategoryPercentage > 40) {
    insights.push({
      type: 'warning',
      message: `${topCategory[0]} dominates your spending at ${topCategoryPercentage.toFixed(0)}%. Diversification could improve financial health.`,
      icon: '⚠️'
    });
  }
  
  // Anomaly detection - unusual spending patterns
  const categoryAverages: Record<string, number> = {};
  Object.entries(categoryTotals).forEach(([category, total]) => {
    categoryAverages[category] = total / (categoryCounts[category] || 1);
  });
  
  const highValueExpenses = expenses.filter(e => e.amount > categoryAverages[e.category] * 2);
  if (highValueExpenses.length > 0) {
    const highestAnomaly = highValueExpenses.sort((a, b) => b.amount - a.amount)[0];
    insights.push({
      type: 'warning',
      message: `Unusual spending detected: ₹${highestAnomaly.amount.toFixed(2)} on ${highestAnomaly.description} is ${((highestAnomaly.amount / categoryAverages[highestAnomaly.category]) * 100).toFixed(0)}% above your ${highestAnomaly.category} average.`,
      icon: '🔍'
    });
  }
  
  // Trend analysis - week over week comparison
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const thisWeekExpenses = expenses.filter(e => new Date(e.date) >= oneWeekAgo);
  const lastWeekExpenses = expenses.filter(e => {
    const date = new Date(e.date);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  });
  
  const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  if (lastWeekTotal > 0) {
    const weekOverWeekChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    if (Math.abs(weekOverWeekChange) > 20) {
      const trend = weekOverWeekChange > 0 ? 'increased' : 'decreased';
      insights.push({
        type: weekOverWeekChange > 0 ? 'warning' : 'tip',
        message: `Spending ${trend} by ${Math.abs(weekOverWeekChange).toFixed(0)}% compared to last week. ${weekOverWeekChange > 0 ? 'Consider reviewing recent purchases.' : 'Great job on cost control!'}`,
        icon: weekOverWeekChange > 0 ? '📊' : '✅'
      });
    }
  }
  
  // Smart personalized recommendations based on spending patterns
  if (categoryTotals['Food & Dining'] > totalSpent * 0.3) {
    insights.push({
      type: 'tip',
      message: `Food & Dining accounts for ${((categoryTotals['Food & Dining'] / totalSpent) * 100).toFixed(0)}% of spending. Meal planning and cooking at home could save ₹${(categoryTotals['Food & Dining'] * 0.3).toFixed(0)}/month.`,
      icon: '🍳'
    });
  }
  
  if (categoryTotals['Entertainment'] > totalSpent * 0.15) {
    insights.push({
      type: 'tip',
      message: `Entertainment spending is notable. Audit subscriptions and consider free alternatives to save ₹${(categoryTotals['Entertainment'] * 0.2).toFixed(0)}/month.`,
      icon: '🎬'
    });
  }
  
  if (categoryTotals['Transportation'] > totalSpent * 0.2) {
    insights.push({
      type: 'tip',
      message: `Transportation costs are significant. Consider carpooling, public transit, or optimizing routes to reduce fuel expenses by ~15%.`,
      icon: '🚗'
    });
  }
  
  // AI-powered budget recommendation
  const recommendedBudget = monthlyProjection * 0.9; // 10% savings target
  insights.push({
    type: 'tip',
    message: `AI Recommended Monthly Budget: ₹${recommendedBudget.toFixed(0)}. This includes a 10% savings buffer for emergencies and future goals.`,
    icon: '🎯'
  });
  
  // Spending frequency analysis
  const frequentCategories = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= expenses.length * 0.3)
    .map(([category]) => category);
  
  if (frequentCategories.length > 0) {
    insights.push({
      type: 'info',
      message: `Your most frequent spending categories: ${frequentCategories.join(', ')}. These represent your core lifestyle expenses.`,
      icon: '�'
    });
  }
  
  // Financial health score
  const diversityScore = Object.keys(categoryTotals).length / 8; // 8 total categories
  const savingsPotential = 1 - (topCategoryPercentage / 100);
  const healthScore = Math.round((diversityScore * 0.4 + savingsPotential * 0.6) * 100);
  
  let healthMessage = '';
  if (healthScore >= 80) {
    healthMessage = 'Excellent financial health! Your spending is well-balanced and optimized.';
  } else if (healthScore >= 60) {
    healthMessage = 'Good financial health with room for optimization in key areas.';
  } else if (healthScore >= 40) {
    healthMessage = 'Moderate financial health. Focus on reducing category concentration.';
  } else {
    healthMessage = 'Financial health needs attention. Prioritize budget planning and expense tracking.';
  }
  
  insights.push({
    type: healthScore >= 60 ? 'tip' : 'warning',
    message: `Financial Health Score: ${healthScore}/100. ${healthMessage}`,
    icon: healthScore >= 60 ? '�' : '💛'
  });
  
  return insights.slice(0, 8); // Limit to top 8 most relevant insights
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
