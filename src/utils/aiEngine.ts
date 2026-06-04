import { Expense, CategoryTotal, Insight, AiSuggestion, Income } from '../types';
import { formatCurrency } from './helpers';

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

export const generateInsights = (expenses: Expense[], income: Income[] = []): Insight[] => {
  const insights: Insight[] = [];
  
  if (expenses.length === 0 && income.length === 0) {
    return [{
      type: 'info',
      message: 'Ready to start! Add your first expense or income to get personalized spending insights and smart money tips.',
      icon: '🚀'
    }];
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const netCashFlow = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
  
  // Emergency Fund Readiness (calculated here for use in other insights)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstExpense = sortedExpenses[0];
  const lastExpense = sortedExpenses[sortedExpenses.length - 1];
  const daysSpan = Math.max(1, Math.ceil((new Date(lastExpense.date).getTime() - new Date(firstExpense.date).getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAverage = totalSpent / daysSpan;
  const monthlyExpenses = dailyAverage * 30;
  const emergencyFundMonths = monthlyExpenses > 0 ? netCashFlow / monthlyExpenses : 0;
  
  // Advanced Category Analysis
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  
  // INCOME-RELATED INSIGHTS
  if (income.length > 0) {
    // Income vs Expense Ratio
    const expenseRatio = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;
    const ratioMessages = [
      `You're spending ${expenseRatio.toFixed(0)}% of your income. ${expenseRatio < 70 ? 'Great! You have room to save more.' : expenseRatio < 90 ? 'You have some savings potential.' : 'Consider reducing expenses to build savings.'}`,
      `Expense-to-income ratio is ${expenseRatio.toFixed(0)}%. ${expenseRatio < 70 ? 'Excellent financial discipline!' : expenseRatio < 90 ? 'Room for improvement in spending habits.' : 'Time to review your budget.'}`,
      `${expenseRatio.toFixed(0)}% of your income goes to expenses. ${expenseRatio < 70 ? 'You are saving well!' : expenseRatio < 90 ? 'Try to keep expenses under 90% of income.' : 'Focus on cutting non-essential costs.'}`,
      `Your expenses consume ${expenseRatio.toFixed(0)}% of income. ${expenseRatio < 70 ? 'Healthy spending pattern!' : expenseRatio < 90 ? 'Monitor your spending closely.' : 'Urgent: Reduce expenses to avoid debt.'}`
    ];
    insights.push({
      type: expenseRatio < 70 ? 'tip' : expenseRatio < 90 ? 'info' : 'warning',
      message: ratioMessages[Math.floor(Math.random() * ratioMessages.length)],
      icon: expenseRatio < 70 ? '💰' : expenseRatio < 90 ? '📊' : '⚠️'
    });

    // Net Cash Flow Analysis
    if (netCashFlow > 0) {
      const cashFlowMessages = [
        `Positive cash flow! You're saving ${formatCurrency(netCashFlow)}. Consider investing this for growth.`,
        `Great job! Your income exceeds expenses by ${formatCurrency(netCashFlow)}. This is your savings power.`,
        `You're in the green with ${formatCurrency(netCashFlow)} surplus. Use this wisely for future goals.`,
        `Net positive: ${formatCurrency(netCashFlow)}. This is the foundation of wealth building.`
      ];
      insights.push({
        type: 'tip',
        message: cashFlowMessages[Math.floor(Math.random() * cashFlowMessages.length)],
        icon: '💵'
      });
    } else if (netCashFlow < 0) {
      const deficitMessages = [
        `You're spending ${formatCurrency(Math.abs(netCashFlow))} more than you earn. Time to cut back.`,
        `Negative cash flow of ${formatCurrency(Math.abs(netCashFlow))}. Review expenses urgently.`,
        `You're in the red by ${formatCurrency(Math.abs(netCashFlow))}. Prioritize essential expenses only.`,
        `Deficit alert: ${formatCurrency(Math.abs(netCashFlow))}. Create a budget to reverse this trend.`
      ];
      insights.push({
        type: 'warning',
        message: deficitMessages[Math.floor(Math.random() * deficitMessages.length)],
        icon: '📉'
      });
    }

    // Savings Rate Analysis
    if (savingsRate > 20) {
      const excellentSavingsMessages = [
        `Excellent savings rate of ${savingsRate.toFixed(0)}%! You're building wealth effectively.`,
        `Amazing! You save ${savingsRate.toFixed(0)}% of income. Keep up this habit for financial freedom.`,
        `${savingsRate.toFixed(0)}% savings rate is outstanding. You're on track for early retirement goals.`,
        `Top-tier saver at ${savingsRate.toFixed(0)}%. Consider accelerating investments with this rate.`
      ];
      insights.push({
        type: 'tip',
        message: excellentSavingsMessages[Math.floor(Math.random() * excellentSavingsMessages.length)],
        icon: '🏆'
      });
    } else if (savingsRate > 10) {
      const goodSavingsMessages = [
        `Good savings rate of ${savingsRate.toFixed(0)}%. Aim for 20%+ for faster wealth building.`,
        `You save ${savingsRate.toFixed(0)}% of income. Solid foundation, room to grow.`,
        `${savingsRate.toFixed(0)}% savings is decent. Small increases can compound significantly.`,
        `Saving ${savingsRate.toFixed(0)}%? Try to boost it to 20% for optimal financial health.`
      ];
      insights.push({
        type: 'info',
        message: goodSavingsMessages[Math.floor(Math.random() * goodSavingsMessages.length)],
        icon: '📈'
      });
    } else if (savingsRate > 0) {
      const lowSavingsMessages = [
        `Savings rate is only ${savingsRate.toFixed(0)}%. Try to increase to at least 10% for security.`,
        `You save ${savingsRate.toFixed(0)}% of income. Consider automating savings to improve.`,
        `${savingsRate.toFixed(0)}% savings rate is low. Every percentage point helps build your safety net.`,
        `Saving ${savingsRate.toFixed(0)}%? Start small and gradually increase to build the habit.`
      ];
      insights.push({
        type: 'warning',
        message: lowSavingsMessages[Math.floor(Math.random() * lowSavingsMessages.length)],
        icon: '💡'
      });
    }

    // Income Source Analysis
    const incomeSources: Record<string, number> = {};
    income.forEach(i => {
      incomeSources[i.category] = (incomeSources[i.category] || 0) + i.amount;
    });
    const sourceEntries = Object.entries(incomeSources).sort((a, b) => b[1] - a[1]);
    
    if (sourceEntries.length > 1) {
      const diversificationMessages = [
        `Income diversification: ${sourceEntries.map(([s]) => s).join(', ')}. Multiple sources = financial security.`,
        `You have ${sourceEntries.length} income streams: ${sourceEntries.map(([s]) => s).join(', ')}. Great for stability!`,
        `Income from ${sourceEntries.length} sources: ${sourceEntries.map(([s]) => s).join(', ')}. Diversification reduces risk.`,
        `${sourceEntries.length} income categories: ${sourceEntries.map(([s]) => s).join(', ')}. Keep diversifying for resilience.`
      ];
      insights.push({
        type: 'tip',
        message: diversificationMessages[Math.floor(Math.random() * diversificationMessages.length)],
        icon: '🌟'
      });
    } else if (sourceEntries.length === 1) {
      const singleSourceMessages = [
        `Single income source detected. Consider adding side income for financial resilience.`,
        `All income from one source. Diversifying could protect against job loss or income drops.`,
        `One income stream? Explore freelance work, investments, or skills monetization for backup.`,
        `Relying on one income source. Building multiple streams increases financial security.`
      ];
      insights.push({
        type: 'info',
        message: singleSourceMessages[Math.floor(Math.random() * singleSourceMessages.length)],
        icon: '🎯'
      });
    }

    // Income Trend Analysis
    if (income.length >= 2) {
      const sortedIncome = [...income].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const recentIncome = sortedIncome.slice(-3).reduce((sum, i) => sum + i.amount, 0);
      const olderIncome = sortedIncome.slice(0, Math.max(1, sortedIncome.length - 3)).reduce((sum, i) => sum + i.amount, 0);
      const incomeGrowth = olderIncome > 0 ? ((recentIncome - olderIncome) / olderIncome) * 100 : 0;
      
      if (incomeGrowth > 10) {
        const growthMessages = [
          `Income up by ${incomeGrowth.toFixed(0)}%! Your earning power is growing. Excellent momentum!`,
          `Income growth of ${incomeGrowth.toFixed(0)}% detected. Keep building on this positive trend.`,
          `Earnings increased ${incomeGrowth.toFixed(0)}%. Use this growth to accelerate savings goals.`,
          `${incomeGrowth.toFixed(0)}% income growth! Great time to increase savings rate.`
        ];
        insights.push({
          type: 'tip',
          message: growthMessages[Math.floor(Math.random() * growthMessages.length)],
          icon: '🚀'
        });
      } else if (incomeGrowth < -10) {
        const declineMessages = [
          `Income down ${Math.abs(incomeGrowth).toFixed(0)}%. Consider new income sources or skills development.`,
          `Income declined by ${Math.abs(incomeGrowth).toFixed(0)}%. Time to explore earning opportunities.`,
          `Earnings dropped ${Math.abs(incomeGrowth).toFixed(0)}%. Upskilling or side hustles could help recover.`,
          `${Math.abs(incomeGrowth).toFixed(0)}% income decrease. Focus on stabilizing and growing income streams.`
        ];
        insights.push({
          type: 'warning',
          message: declineMessages[Math.floor(Math.random() * declineMessages.length)],
          icon: '📉'
        });
      }
    }

    // Emergency Fund Readiness
    const monthlyExpenses = dailyAverage * 30;
    const emergencyFundMonths = monthlyExpenses > 0 ? netCashFlow / monthlyExpenses : 0;
    
    if (emergencyFundMonths >= 6) {
      const emergencyMessages = [
        `Emergency fund covers ${emergencyFundMonths.toFixed(0)} months of expenses. Excellent financial security!`,
        `You have ${emergencyFundMonths.toFixed(0)} months of expenses saved. Your emergency fund is fully funded.`,
        `${emergencyFundMonths.toFixed(0)} months of emergency savings. You're well-protected against financial shocks.`,
        `Emergency fund at ${emergencyFundMonths.toFixed(0)} months. Outstanding preparation for unexpected costs.`
      ];
      insights.push({
        type: 'tip',
        message: emergencyMessages[Math.floor(Math.random() * emergencyMessages.length)],
        icon: '🛡️'
      });
    } else if (emergencyFundMonths >= 3) {
      const partialMessages = [
        `Emergency fund covers ${emergencyFundMonths.toFixed(0)} months. Aim for 6 months for full protection.`,
        `${emergencyFundMonths.toFixed(0)} months of expenses saved. Good progress toward 6-month emergency fund.`,
        `Partial emergency fund: ${emergencyFundMonths.toFixed(0)} months. Keep building to reach 6 months.`,
        `You have ${emergencyFundMonths.toFixed(0)} months covered. 3 more months for complete security.`
      ];
      insights.push({
        type: 'info',
        message: partialMessages[Math.floor(Math.random() * partialMessages.length)],
        icon: '🔒'
      });
    } else if (emergencyFundMonths > 0) {
      const buildingMessages = [
        `Emergency fund at ${emergencyFundMonths.toFixed(1)} months. Prioritize building this to 3-6 months.`,
        `Only ${emergencyFundMonths.toFixed(1)} months covered. Start an emergency fund immediately.`,
        `${emergencyFundMonths.toFixed(1)} months of emergency savings. Build this to 3 months minimum.`,
        `Emergency fund needs work. ${emergencyFundMonths.toFixed(1)} months is not enough for security.`
      ];
      insights.push({
        type: 'warning',
        message: buildingMessages[Math.floor(Math.random() * buildingMessages.length)],
        icon: '⚠️'
      });
    } else {
      const noFundMessages = [
        `No emergency fund detected. Start saving 3-6 months of expenses for financial safety.`,
        `Emergency fund is empty. This is your top priority for financial security.`,
        `Zero emergency savings. Begin building a 3-month expense buffer immediately.`,
        `Critical: No emergency fund. Save 3-6 months of expenses before other financial goals.`
      ];
      insights.push({
        type: 'warning',
        message: noFundMessages[Math.floor(Math.random() * noFundMessages.length)],
        icon: '🚨'
      });
    }
  }
  
  // Predictive analytics - monthly projection with varied messages
  const monthlyProjection = dailyAverage * 30;
  const projectionMessages = [
    `At your current pace of ${formatCurrency(dailyAverage)}/day, you'll likely spend ${formatCurrency(monthlyProjection)} this month.`,
    `Based on recent spending, your monthly estimate is ${formatCurrency(monthlyProjection)}. Keep this in mind for budgeting.`,
    `Your daily average is ${formatCurrency(dailyAverage)}, which projects to ${formatCurrency(monthlyProjection)} for the full month.`,
    `If you continue spending like this, expect to spend ${formatCurrency(monthlyProjection)} by month's end.`
  ];
  insights.push({
    type: 'info',
    message: projectionMessages[Math.floor(Math.random() * projectionMessages.length)],
    icon: '📈'
  });
  
  // Category concentration analysis with varied messages
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = categoryEntries[0];
  const topCategoryPercentage = (topCategory[1] / totalSpent) * 100;
  
  if (topCategoryPercentage > 40) {
    const concentrationMessages = [
      `${topCategory[0]} takes up ${topCategoryPercentage.toFixed(0)}% of your spending. Try spreading it across other categories.`,
      `You're spending ${topCategoryPercentage.toFixed(0)}% on ${topCategory[0]}. Consider diversifying your expenses.`,
      `Most of your money (${topCategoryPercentage.toFixed(0)}%) goes to ${topCategory[0]}. A balanced approach might help.`,
      `${topCategory[0]} is your biggest expense at ${topCategoryPercentage.toFixed(0)}%. Maybe explore other spending areas?`
    ];
    insights.push({
      type: 'warning',
      message: concentrationMessages[Math.floor(Math.random() * concentrationMessages.length)],
      icon: '⚠️'
    });
  }
  
  // Anomaly detection - unusual spending patterns with varied messages
  const categoryAverages: Record<string, number> = {};
  Object.entries(categoryTotals).forEach(([category, total]) => {
    categoryAverages[category] = total / (categoryCounts[category] || 1);
  });
  
  const highValueExpenses = expenses.filter(e => e.amount > categoryAverages[e.category] * 2);
  if (highValueExpenses.length > 0) {
    const highestAnomaly = highValueExpenses.sort((a, b) => b.amount - a.amount)[0];
    const anomalyPercentage = ((highestAnomaly.amount / categoryAverages[highestAnomaly.category]) * 100).toFixed(0);
    const anomalyMessages = [
      `You spent ${formatCurrency(highestAnomaly.amount)} on ${highestAnomaly.description}, which is ${anomalyPercentage}% higher than usual for this category.`,
      `That ${highestAnomaly.description} expense of ${formatCurrency(highestAnomaly.amount)} is ${anomalyPercentage}% above your typical ${highestAnomaly.category} spending.`,
      `Unusual alert: ${formatCurrency(highestAnomaly.amount)} for ${highestAnomaly.description} is ${anomalyPercentage}% more than your average ${highestAnomaly.category} cost.`,
      `Noticed a spike: ${highestAnomaly.description} cost ${formatCurrency(highestAnomaly.amount)}, ${anomalyPercentage}% higher than normal.`
    ];
    insights.push({
      type: 'warning',
      message: anomalyMessages[Math.floor(Math.random() * anomalyMessages.length)],
      icon: '🔍'
    });
  }
  
  // Trend analysis - week over week comparison with varied messages
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
      const trendMessages = [
        `Spending ${trend} by ${Math.abs(weekOverWeekChange).toFixed(0)}% vs last week. ${weekOverWeekChange > 0 ? 'Time to review recent purchases.' : 'Nice work on cutting costs!'}`,
        `Compared to last week, your spending ${trend} by ${Math.abs(weekOverWeekChange).toFixed(0)}%. ${weekOverWeekChange > 0 ? 'Maybe slow down a bit?' : 'Keep up the good habits!'}`,
        `Week-over-week change: ${Math.abs(weekOverWeekChange).toFixed(0)}% ${trend}. ${weekOverWeekChange > 0 ? 'Check if these are necessary expenses.' : 'You are saving money effectively!'}`,
        `Your spending went ${trend} by ${Math.abs(weekOverWeekChange).toFixed(0)}% this week. ${weekOverWeekChange > 0 ? 'Consider setting a limit.' : 'Great job managing your budget!'}`
      ];
      insights.push({
        type: weekOverWeekChange > 0 ? 'warning' : 'tip',
        message: trendMessages[Math.floor(Math.random() * trendMessages.length)],
        icon: weekOverWeekChange > 0 ? '📊' : '✅'
      });
    }
  }
  
  // Smart personalized recommendations based on spending patterns with varied messages
  if (categoryTotals['Food & Dining'] > totalSpent * 0.3) {
    const foodMessages = [
      `Food & Dining is ${((categoryTotals['Food & Dining'] / totalSpent) * 100).toFixed(0)}% of your spending. Cooking at home could save ${formatCurrency(categoryTotals['Food & Dining'] * 0.3)}/month.`,
      `You're spending ${((categoryTotals['Food & Dining'] / totalSpent) * 100).toFixed(0)}% on food. Try meal prep to save around ${formatCurrency(categoryTotals['Food & Dining'] * 0.3)} monthly.`,
      `Food expenses are high at ${((categoryTotals['Food & Dining'] / totalSpent) * 100).toFixed(0)}%. Home cooking might help you save ${formatCurrency(categoryTotals['Food & Dining'] * 0.3)}.`,
      `${((categoryTotals['Food & Dining'] / totalSpent) * 100).toFixed(0)}% of your budget goes to food. Consider eating out less to save ${formatCurrency(categoryTotals['Food & Dining'] * 0.3)}.`
    ];
    insights.push({
      type: 'tip',
      message: foodMessages[Math.floor(Math.random() * foodMessages.length)],
      icon: '🍳'
    });
  }
  
  if (categoryTotals['Entertainment'] > totalSpent * 0.15) {
    const entertainmentMessages = [
      `Entertainment is taking up ${((categoryTotals['Entertainment'] / totalSpent) * 100).toFixed(0)}% of spending. Review subscriptions to save ${formatCurrency(categoryTotals['Entertainment'] * 0.2)}.`,
      `You spend ${((categoryTotals['Entertainment'] / totalSpent) * 100).toFixed(0)}% on entertainment. Cancel unused subscriptions to save ${formatCurrency(categoryTotals['Entertainment'] * 0.2)}.`,
      `Entertainment costs are ${((categoryTotals['Entertainment'] / totalSpent) * 100).toFixed(0)}% of total. Free alternatives could save you ${formatCurrency(categoryTotals['Entertainment'] * 0.2)}.`,
      `${((categoryTotals['Entertainment'] / totalSpent) * 100).toFixed(0)}% goes to entertainment. Check which subscriptions you actually use and save ${formatCurrency(categoryTotals['Entertainment'] * 0.2)}.`
    ];
    insights.push({
      type: 'tip',
      message: entertainmentMessages[Math.floor(Math.random() * entertainmentMessages.length)],
      icon: '🎬'
    });
  }
  
  if (categoryTotals['Transportation'] > totalSpent * 0.2) {
    const transportMessages = [
      `Transportation is ${((categoryTotals['Transportation'] / totalSpent) * 100).toFixed(0)}% of spending. Carpooling or public transit could cut costs by ~15%.`,
      `You're spending ${((categoryTotals['Transportation'] / totalSpent) * 100).toFixed(0)}% on transport. Try sharing rides or using public transport to save money.`,
      `Transport costs are significant at ${((categoryTotals['Transportation'] / totalSpent) * 100).toFixed(0)}%. Consider alternative commute options to reduce expenses.`,
      `${((categoryTotals['Transportation'] / totalSpent) * 100).toFixed(0)}% goes to transportation. Optimize your routes or share rides to save on fuel.`
    ];
    insights.push({
      type: 'tip',
      message: transportMessages[Math.floor(Math.random() * transportMessages.length)],
      icon: '🚗'
    });
  }
  
  // AI-powered budget recommendation with varied messages
  const recommendedBudget = monthlyProjection * 0.9;
  const budgetMessages = [
    `Smart budget tip: Aim for ${formatCurrency(recommendedBudget)}/month. This builds in 10% savings for emergencies and goals.`,
    `Based on your spending, try a budget of ${formatCurrency(recommendedBudget)}/month. Includes a 10% savings buffer for peace of mind.`,
    `Recommended monthly budget: ${formatCurrency(recommendedBudget)}. This leaves room for 10% savings toward your future goals.`,
    `Set a monthly target of ${formatCurrency(recommendedBudget)}. This smart budget includes automatic savings for unexpected expenses.`
  ];
  insights.push({
    type: 'tip',
    message: budgetMessages[Math.floor(Math.random() * budgetMessages.length)],
    icon: '🎯'
  });
  
  // Spending frequency analysis with varied messages
  const frequentCategories = Object.entries(categoryCounts)
    .filter(([_, count]) => count >= expenses.length * 0.3)
    .map(([category]) => category);
  
  if (frequentCategories.length > 0) {
    const frequencyMessages = [
      `Your top spending areas: ${frequentCategories.join(', ')}. These are your regular expenses to watch closely.`,
      `You spend most often on: ${frequentCategories.join(', ')}. These categories deserve your attention for budgeting.`,
      `Frequent spending in: ${frequentCategories.join(', ')}. Focus on optimizing these core expenses.`,
      `Main expense categories: ${frequentCategories.join(', ')}. Track these carefully to stay on budget.`
    ];
    insights.push({
      type: 'info',
      message: frequencyMessages[Math.floor(Math.random() * frequencyMessages.length)],
      icon: '📊'
    });
  }
  
  // Spending patterns by day of week
  if (expenses.length >= 5) {
    const dayOfWeekTotals: Record<number, number> = {};
    expenses.forEach(e => {
      const day = new Date(e.date).getDay();
      dayOfWeekTotals[day] = (dayOfWeekTotals[day] || 0) + e.amount;
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxDay = Object.entries(dayOfWeekTotals).sort((a, b) => b[1] - a[1])[0];
    
    if (maxDay) {
      const dayPatternMessages = [
        `You spend most on ${dayNames[parseInt(maxDay[0])]}. Plan your budget around this pattern.`,
        `${dayNames[parseInt(maxDay[0])]} is your biggest spending day. Consider setting weekly limits.`,
        `Peak spending day: ${dayNames[parseInt(maxDay[0])]}. Be extra mindful on this day.`,
        `Most expenses hit on ${dayNames[parseInt(maxDay[0])]}. Set a reminder to check spending then.`
      ];
      insights.push({
        type: 'info',
        message: dayPatternMessages[Math.floor(Math.random() * dayPatternMessages.length)],
        icon: '📅'
      });
    }
  }

  // Monthly spending pattern analysis
  if (expenses.length >= 10) {
    const monthlyTotals: Record<string, number> = {};
    expenses.forEach(e => {
      const month = new Date(e.date).toLocaleString('default', { month: 'long' });
      monthlyTotals[month] = (monthlyTotals[month] || 0) + e.amount;
    });
    
    const monthEntries = Object.entries(monthlyTotals);
    if (monthEntries.length >= 2) {
      const sortedMonths = monthEntries.sort((a, b) => b[1] - a[1]);
      const highestMonth = sortedMonths[0];
      const lowestMonth = sortedMonths[sortedMonths.length - 1];
      
      if (highestMonth[1] > lowestMonth[1] * 1.5) {
        const seasonalMessages = [
          `Spending varies significantly by month. ${highestMonth[0]} is your highest (${formatCurrency(highestMonth[1])}).`,
          `Seasonal pattern detected: ${highestMonth[0]} costs ${formatCurrency(highestMonth[1])} vs ${lowestMonth[0]} at ${formatCurrency(lowestMonth[1])}.`,
          `Monthly spending fluctuates. ${highestMonth[0]} peaks at ${formatCurrency(highestMonth[1])}. Plan accordingly.`,
          `${highestMonth[0]} is your most expensive month (${formatCurrency(highestMonth[1])}). Budget extra for this period.`
        ];
        insights.push({
          type: 'info',
          message: seasonalMessages[Math.floor(Math.random() * seasonalMessages.length)],
          icon: '🗓️'
        });
      }
    }
  }

  // Financial Milestone Tracker
  if (netCashFlow > 0) {
    const milestones = [
      { name: 'First ₹1,000 saved', target: 1000, icon: '🎯' },
      { name: '₹5,000 milestone', target: 5000, icon: '🏅' },
      { name: '₹10,000 achievement', target: 10000, icon: '🏆' },
      { name: '₹25,000 saved', target: 25000, icon: '🌟' },
      { name: '₹50,000 milestone', target: 50000, icon: '💎' },
      { name: '₹1,00,000 achievement', target: 100000, icon: '👑' }
    ];
    
    const currentMilestone = milestones.filter(m => netCashFlow >= m.target).pop();
    const nextMilestone = milestones.find(m => netCashFlow < m.target);
    
    if (currentMilestone && nextMilestone) {
      const progress = ((netCashFlow - currentMilestone.target) / (nextMilestone.target - currentMilestone.target)) * 100;
      const milestoneMessages = [
        `You've reached ${currentMilestone.name}! ${progress.toFixed(0)}% to ${nextMilestone.name}. Keep going!`,
        `Milestone unlocked: ${currentMilestone.name}. ${progress.toFixed(0)}% progress toward ${nextMilestone.name}.`,
        `${currentMilestone.icon} ${currentMilestone.name} achieved! ${progress.toFixed(0)}% to next goal: ${nextMilestone.name}.`,
        `Great progress! ${currentMilestone.name} done. ${progress.toFixed(0)}% closer to ${nextMilestone.name}.`
      ];
      insights.push({
        type: 'tip',
        message: milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)],
        icon: currentMilestone.icon
      });
    } else if (nextMilestone) {
      const progress = (netCashFlow / nextMilestone.target) * 100;
      const goalMessages = [
        `Working toward ${nextMilestone.name}. ${progress.toFixed(0)}% complete. Keep saving!`,
        `${progress.toFixed(0)}% to ${nextMilestone.name}. Every bit counts toward your goal.`,
        `Goal: ${nextMilestone.name}. You're ${progress.toFixed(0)}% there. Stay consistent!`,
        `${nextMilestone.icon} Target: ${nextMilestone.name}. ${progress.toFixed(0)}% achieved so far.`
      ];
      insights.push({
        type: 'info',
        message: goalMessages[Math.floor(Math.random() * goalMessages.length)],
        icon: nextMilestone.icon
      });
    }
  }

  // Predictive Budgeting with AI
  const recommendedMonthlyBudget = monthlyProjection * 0.9;
  const budgetBreakdown: Record<string, number> = {};
  Object.entries(categoryTotals).forEach(([category, total]) => {
    const categoryPercentage = total / totalSpent;
    budgetBreakdown[category] = recommendedMonthlyBudget * categoryPercentage;
  });
  
  const topBudgetItem = Object.entries(budgetBreakdown).sort((a, b) => b[1] - a[1])[0];
  if (topBudgetItem) {
    const budgetMessages = [
      `AI Budget Tip: Allocate ${formatCurrency(topBudgetItem[1])}/month for ${topBudgetItem[0]} based on your patterns.`,
      `Smart budget: ${formatCurrency(topBudgetItem[1])} for ${topBudgetItem[0]} this month. Track this category closely.`,
      `Budget recommendation: ${formatCurrency(topBudgetItem[1])} for ${topBudgetItem[0]}. Your biggest spending area.`,
      `AI suggests ${formatCurrency(topBudgetItem[1])} monthly budget for ${topBudgetItem[0]}. Adjust as needed.`
    ];
    insights.push({
      type: 'tip',
      message: budgetMessages[Math.floor(Math.random() * budgetMessages.length)],
      icon: '🎯'
    });
  }

  // Investment Readiness Check
  if (savingsRate > 20 && emergencyFundMonths >= 3) {
    const investmentMessages = [
      `You're ready to invest! ${savingsRate.toFixed(0)}% savings + emergency fund = investment opportunity.`,
      `Investment ready! High savings rate (${savingsRate.toFixed(0)}%) + emergency fund = start investing.`,
      `Time to invest: Your savings rate (${savingsRate.toFixed(0)}%) and emergency fund are solid.`,
      `Investment opportunity! ${savingsRate.toFixed(0)}% savings rate with emergency fund coverage.`
    ];
    insights.push({
      type: 'tip',
      message: investmentMessages[Math.floor(Math.random() * investmentMessages.length)],
      icon: '📈'
    });
  } else if (savingsRate > 10 && emergencyFundMonths >= 3) {
    const almostReadyMessages = [
      `Almost investment-ready. Boost savings to 20%+ for optimal investing position.`,
      `Close to investing! Increase savings rate to 20% for better investment readiness.`,
      `Investment potential: Raise savings to 20% while maintaining emergency fund.`,
      `Nearly ready to invest. Focus on increasing savings rate to 20%.`
    ];
    insights.push({
      type: 'info',
      message: almostReadyMessages[Math.floor(Math.random() * almostReadyMessages.length)],
      icon: '💡'
    });
  }

  // Spending Velocity Alert
  const recentExpenses = expenses.slice(-5);
  if (recentExpenses.length >= 3) {
    const recentAverage = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / recentExpenses.length;
    const overallAverage = totalSpent / expenses.length;
    
    if (recentAverage > overallAverage * 1.5) {
      const velocityMessages = [
        `Recent spending spike detected! Average expense increased significantly. Check recent purchases.`,
        `Spending velocity up! Recent expenses are ${((recentAverage / overallAverage) * 100).toFixed(0)}% of average.`,
        `Alert: Recent spending is higher than usual. Review your last 5 transactions.`,
        `Spending acceleration detected. Recent purchases are above your typical amounts.`
      ];
      insights.push({
        type: 'warning',
        message: velocityMessages[Math.floor(Math.random() * velocityMessages.length)],
        icon: '⚡'
      });
    }
  }

  // Year-to-Date Analysis
  const currentYear = new Date().getFullYear();
  const ytdExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
  const ytdIncome = income.filter(i => new Date(i.date).getFullYear() === currentYear);
  
  if (ytdExpenses.length > 0 || ytdIncome.length > 0) {
    const ytdSpent = ytdExpenses.reduce((sum, e) => sum + e.amount, 0);
    const ytdEarned = ytdIncome.reduce((sum, i) => sum + i.amount, 0);
    const ytdNet = ytdEarned - ytdSpent;
    
    if (ytdEarned > 0) {
      const ytdMessages = [
        `Year-to-date: Earned ${formatCurrency(ytdEarned)}, spent ${formatCurrency(ytdSpent)}. Net: ${formatCurrency(ytdNet)}.`,
        `YTD summary: ${formatCurrency(ytdSpent)} expenses vs ${formatCurrency(ytdEarned)} income. Net: ${formatCurrency(ytdNet)}.`,
        `This year: ${formatCurrency(ytdEarned)} in, ${formatCurrency(ytdSpent)} out. Net position: ${formatCurrency(ytdNet)}.`,
        `YTD performance: ${formatCurrency(ytdNet)} net from ${formatCurrency(ytdEarned)} income. ${ytdNet > 0 ? 'Positive!' : 'Review needed.'}`
      ];
      insights.push({
        type: ytdNet > 0 ? 'tip' : 'info',
        message: ytdMessages[Math.floor(Math.random() * ytdMessages.length)],
        icon: '📊'
      });
    }
  }

  // Smart Recommendations Based on Shopping Patterns
  if (categoryTotals['Shopping'] > totalSpent * 0.2) {
    const shoppingMessages = [
      `Shopping is ${((categoryTotals['Shopping'] / totalSpent) * 100).toFixed(0)}% of spending. Try the 30-day rule before purchases.`,
      `High shopping spend at ${((categoryTotals['Shopping'] / totalSpent) * 100).toFixed(0)}%. Wait 30 days before buying non-essentials.`,
      `${((categoryTotals['Shopping'] / totalSpent) * 100).toFixed(0)}% on shopping. Use wish lists to curb impulse buys.`,
      `Shopping alert: ${((categoryTotals['Shopping'] / totalSpent) * 100).toFixed(0)}% of budget. Consider needs vs wants.`
    ];
    insights.push({
      type: 'tip',
      message: shoppingMessages[Math.floor(Math.random() * shoppingMessages.length)],
      icon: '🛍️'
    });
  }

  // Weekly Spending Average
  if (expenses.length >= 7) {
    const weeklyAverage = totalSpent / (daysSpan / 7);
    const weeklyMessages = [
      `Weekly spending average: ${formatCurrency(weeklyAverage)}. Use this for weekly budget planning.`,
      `Your weekly average is ${formatCurrency(weeklyAverage)}. Set weekly spending limits based on this.`,
      `Average weekly spend: ${formatCurrency(weeklyAverage)}. Track against this each week.`,
      `Weekly baseline: ${formatCurrency(weeklyAverage)}. Aim to stay under this amount.`
    ];
    insights.push({
      type: 'info',
      message: weeklyMessages[Math.floor(Math.random() * weeklyMessages.length)],
      icon: '📋'
    });
  }

  // Financial Freedom Progress
  if (totalIncome > 0) {
    const annualIncome = totalIncome * 12;
    const annualExpenses = monthlyProjection * 12;
    const annualSavings = annualIncome - annualExpenses;
    const yearsToFreedom = annualSavings > 0 ? (annualExpenses * 25) / annualSavings : Infinity;
    
    if (yearsToFreedom < 50 && yearsToFreedom > 0) {
      const freedomMessages = [
        `At current savings rate, financial freedom in ~${yearsToFreedom.toFixed(0)} years. Increase savings to accelerate!`,
        `Freedom timeline: ${yearsToFreedom.toFixed(0)} years at current pace. Boost savings to retire earlier.`,
        `Financial independence in ${yearsToFreedom.toFixed(0)} years if you maintain this savings rate.`,
        `Path to freedom: ${yearsToFreedom.toFixed(0)} years. Every 1% savings increase shaves time off this.`
      ];
      insights.push({
        type: 'tip',
        message: freedomMessages[Math.floor(Math.random() * freedomMessages.length)],
        icon: '🏝️'
      });
    }
  }

  // Financial health score with varied messages
  const diversityScore = Object.keys(categoryTotals).length / 8;
  const savingsPotential = 1 - (topCategoryPercentage / 100);
  const healthScore = Math.round((diversityScore * 0.4 + savingsPotential * 0.6) * 100);
  
  let healthMessage = '';
  if (healthScore >= 80) {
    const excellentMessages = [
      'Excellent financial health! Your spending is well-balanced and optimized.',
      'Great job! Your finances are in excellent shape with smart spending habits.',
      'Your financial health is excellent! Keep up the balanced spending approach.',
      'Outstanding! Your money management shows excellent balance and control.'
    ];
    healthMessage = excellentMessages[Math.floor(Math.random() * excellentMessages.length)];
  } else if (healthScore >= 60) {
    const goodMessages = [
      'Good financial health with room for optimization in key areas.',
      'Your finances are in good shape. Small tweaks could make them even better.',
      'Solid financial health! A few adjustments could improve your money management.',
      'Doing well financially! Focus on a couple of areas to reach excellent status.'
    ];
    healthMessage = goodMessages[Math.floor(Math.random() * goodMessages.length)];
  } else if (healthScore >= 40) {
    const moderateMessages = [
      'Moderate financial health. Focus on reducing category concentration.',
      'Your finances need some attention. Try to spread spending across more categories.',
      'Fair financial health. Work on balancing your spending categories for improvement.',
      'Room for improvement. Diversify your spending to boost your financial health.'
    ];
    healthMessage = moderateMessages[Math.floor(Math.random() * moderateMessages.length)];
  } else {
    const needsAttentionMessages = [
      'Financial health needs attention. Prioritize budget planning and expense tracking.',
      'Your finances need work. Start with a budget and track every expense carefully.',
      'Time to focus on finances. Budget planning and tracking will help improve this score.',
      'Financial health requires attention. Create a budget and monitor your spending habits.'
    ];
    healthMessage = needsAttentionMessages[Math.floor(Math.random() * needsAttentionMessages.length)];
  }
  
  insights.push({
    type: healthScore >= 60 ? 'tip' : 'warning',
    message: `Financial Health Score: ${healthScore}/100. ${healthMessage}`,
    icon: healthScore >= 60 ? '💚' : '💛'
  });
  
  return insights.slice(0, 15);
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
