import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ThumbsUp, ThumbsDown, Copy, Sparkles, Lightbulb, TrendingUp, AlertCircle, Clock, ChevronDown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Expense, Income } from '../types';
import { formatCurrency } from '../utils/helpers';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickActions?: string[];
  helpful?: boolean;
  isStreaming?: boolean;
};

interface AIChatbotProps {
  expenses?: Expense[];
  income?: Income[];
}

// Advanced local AI with pattern matching and context awareness
class LocalAI {
  private conversationHistory: string[] = [];
  private financialContext: { expenses: Expense[]; income: Income[] } = { expenses: [], income: [] };

  constructor(expenses?: Expense[], income?: Income[]) {
    if (expenses) this.financialContext.expenses = expenses;
    if (income) this.financialContext.income = income;
  }

  updateContext(expenses: Expense[], income: Income[]) {
    this.financialContext.expenses = expenses;
    this.financialContext.income = income;
  }

  addToHistory(message: string) {
    this.conversationHistory.push(message);
    if (this.conversationHistory.length > 10) {
      this.conversationHistory.shift();
    }
  }

  private fuzzyMatch(input: string, patterns: string[]): boolean {
    const lowerInput = input.toLowerCase();
    return patterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      return lowerInput.includes(lowerPattern) || lowerPattern.includes(lowerInput);
    });
  }

  private extractNumbers(text: string): number[] {
    const matches = text.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
  }

  private extractDate(text: string): Date | null {
    const now = new Date();
    
    if (/today/i.test(text)) return now;
    if (/yesterday/i.test(text)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    if (/this month/i.test(text)) return now;
    if (/last month/i.test(text)) {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return lastMonth;
    }
    
    return null;
  }

  private getFinancialInsights(): string {
    const { expenses, income } = this.financialContext;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

    let insights = `📊 **Financial Overview**\n\n`;
    insights += `• Total Income: ${formatCurrency(totalIncome)}\n`;
    insights += `• Total Expenses: ${formatCurrency(totalExpenses)}\n`;
    insights += `• Net Savings: ${formatCurrency(netSavings)} (${savingsRate}%)\n`;
    insights += `• Total Transactions: ${expenses.length + income.length}\n\n`;

    if (expenses.length > 0) {
      const categoryTotals = new Map<string, number>();
      expenses.forEach(e => {
        categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
      });
      
      const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
      insights += `� **Top Spending Category**: ${topCategory[0]} (${formatCurrency(topCategory[1])})\n`;
    }

    if (income.length > 0) {
      const incomeCategories = new Map<string, number>();
      income.forEach(i => {
        incomeCategories.set(i.category, (incomeCategories.get(i.category) || 0) + i.amount);
      });
      
      const topIncome = Array.from(incomeCategories.entries()).sort((a, b) => b[1] - a[1])[0];
      insights += `� **Top Income Source**: ${topIncome[0]} (${formatCurrency(topIncome[1])})\n`;
    }

    return insights;
  }

  private getTransactionHistory(type: 'all' | 'expenses' | 'income', limit: number = 10): string {
    const { expenses, income } = this.financialContext;
    
    let transactions: Array<{ type: string; description: string; amount: number; category: string; date: string }> = [];
    
    if (type === 'all' || type === 'expenses') {
      transactions.push(...expenses.map(e => ({
        type: 'expense',
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date
      })));
    }
    
    if (type === 'all' || type === 'income') {
      transactions.push(...income.map(i => ({
        type: 'income',
        description: i.description,
        amount: i.amount,
        category: i.category,
        date: i.date
      })));
    }
    
    // Sort by date (most recent first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Limit results
    transactions = transactions.slice(0, limit);
    
    if (transactions.length === 0) {
      return `No ${type === 'all' ? 'transactions' : type} found. Start adding some to see your history!`;
    }
    
    let history = `📜 **Transaction History** (${type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)})\n\n`;
    
    transactions.forEach((t, index) => {
      const icon = t.type === 'income' ? '💰' : '💸';
      const sign = t.type === 'income' ? '+' : '-';
      history += `${index + 1}. ${icon} ${t.description}\n`;
      history += `   ${sign}${formatCurrency(t.amount)} • ${t.category} • ${t.date}\n\n`;
    });
    
    if (transactions.length >= limit) {
      history += `Showing ${limit} most recent transactions. Ask for more if needed!`;
    }
    
    return history;
  }

  private getRecentTransactions(days: number = 7): string {
    const { expenses, income } = this.financialContext;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    let transactions: Array<{ type: string; description: string; amount: number; category: string; date: string }> = [];
    
    expenses.forEach(e => {
      if (new Date(e.date) >= cutoffDate) {
        transactions.push({
          type: 'expense',
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: e.date
        });
      }
    });
    
    income.forEach(i => {
      if (new Date(i.date) >= cutoffDate) {
        transactions.push({
          type: 'income',
          description: i.description,
          amount: i.amount,
          category: i.category,
          date: i.date
        });
      }
    });
    
    // Sort by date (most recent first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (transactions.length === 0) {
      return `No transactions in the last ${days} days.`;
    }
    
    let history = `📅 **Last ${days} Days**\n\n`;
    
    transactions.forEach((t, index) => {
      const icon = t.type === 'income' ? '💰' : '💸';
      const sign = t.type === 'income' ? '+' : '-';
      history += `${index + 1}. ${icon} ${t.description}\n`;
      history += `   ${sign}${formatCurrency(t.amount)} • ${t.category} • ${t.date}\n\n`;
    });
    
    return history;
  }

  private getComprehensiveFinancialAnalysis(): string {
    const { expenses, income } = this.financialContext;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

    let analysis = `📊 **COMPREHENSIVE FINANCIAL ANALYSIS**\n\n`;
    
    // Income Details
    analysis += `💰 **INCOME BREAKDOWN**\n`;
    analysis += `• Total Income: ${formatCurrency(totalIncome)}\n`;
    analysis += `• Income Entries: ${income.length}\n`;
    if (income.length > 0) {
      const avgIncome = totalIncome / income.length;
      const sortedIncome = [...income].sort((a, b) => b.amount - a.amount);
      const maxIncome = sortedIncome[0]?.amount || 0;
      const minIncome = sortedIncome[sortedIncome.length - 1]?.amount || 0;
      const incomeRange = maxIncome - minIncome;
      
      analysis += `• Average Income: ${formatCurrency(avgIncome)}\n`;
      analysis += `• Highest Income: ${formatCurrency(maxIncome)}\n`;
      analysis += `• Lowest Income: ${formatCurrency(minIncome)}\n`;
      analysis += `• Income Range: ${formatCurrency(incomeRange)}\n`;
      
      const incomeCategories = new Map<string, number>();
      income.forEach(i => {
        incomeCategories.set(i.category, (incomeCategories.get(i.category) || 0) + i.amount);
      });
      
      const sortedIncomeCategories = Array.from(incomeCategories.entries()).sort((a, b) => b[1] - a[1]);
      analysis += `• Income Sources: ${sortedIncomeCategories.length} categories\n`;
      sortedIncomeCategories.forEach((cat, index) => {
        const percentage = totalIncome > 0 ? ((cat[1] / totalIncome) * 100).toFixed(1) : '0';
        analysis += `  ${index + 1}. ${cat[0]}: ${formatCurrency(cat[1])} (${percentage}%)\n`;
      });
    }
    analysis += `\n`;
    
    // Expense Details
    analysis += `💸 **EXPENSE BREAKDOWN**\n`;
    analysis += `• Total Expenses: ${formatCurrency(totalExpenses)}\n`;
    analysis += `• Expense Entries: ${expenses.length}\n`;
    if (expenses.length > 0) {
      const avgExpense = totalExpenses / expenses.length;
      const sortedExpenses = [...expenses].sort((a, b) => b.amount - a.amount);
      const maxExpense = sortedExpenses[0]?.amount || 0;
      const minExpense = sortedExpenses[sortedExpenses.length - 1]?.amount || 0;
      const expenseRange = maxExpense - minExpense;
      
      analysis += `• Average Expense: ${formatCurrency(avgExpense)}\n`;
      analysis += `• Highest Expense: ${formatCurrency(maxExpense)}\n`;
      analysis += `• Lowest Expense: ${formatCurrency(minExpense)}\n`;
      analysis += `• Expense Range: ${formatCurrency(expenseRange)}\n`;
      
      const categoryTotals = new Map<string, number>();
      expenses.forEach(e => {
        categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
      });
      
      const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
      analysis += `• Spending Categories: ${sortedCategories.length} categories\n`;
      sortedCategories.forEach((cat, index) => {
        const percentage = totalExpenses > 0 ? ((cat[1] / totalExpenses) * 100).toFixed(1) : '0';
        analysis += `  ${index + 1}. ${cat[0]}: ${formatCurrency(cat[1])} (${percentage}%)\n`;
      });
    }
    analysis += `\n`;
    
    // Savings Details
    analysis += `💎 **SAVINGS ANALYSIS**\n`;
    analysis += `• Net Savings: ${formatCurrency(netSavings)}\n`;
    analysis += `• Savings Rate: ${savingsRate}%\n`;
    if (totalIncome > 0) {
      const recommendedSavings = totalIncome * 0.2;
      const emergencyFund = totalExpenses * 6;
      analysis += `• Recommended Savings (20%): ${formatCurrency(recommendedSavings)}\n`;
      analysis += `• Emergency Fund (6 months expenses): ${formatCurrency(emergencyFund)}\n`;
      if (netSavings >= recommendedSavings) {
        analysis += `• Status: ✅ Exceeding recommended savings\n`;
      } else if (netSavings > 0) {
        analysis += `• Status: ⚠️ Below recommended savings by ${formatCurrency(recommendedSavings - netSavings)}\n`;
      } else {
        analysis += `• Status: ❌ Negative savings (spending more than earning)\n`;
      }
    }
    analysis += `\n`;
    
    // Transaction Summary
    analysis += `📋 **TRANSACTION SUMMARY**\n`;
    analysis += `• Total Transactions: ${expenses.length + income.length}\n`;
    analysis += `• Income Transactions: ${income.length}\n`;
    analysis += `• Expense Transactions: ${expenses.length}\n`;
    analysis += `• Transaction Ratio: ${income.length > 0 ? (expenses.length / income.length).toFixed(2) : 'N/A'} expenses per income\n`;
    
    // Time-based analysis
    if (expenses.length > 0 || income.length > 0) {
      const allDates = [...expenses.map(e => new Date(e.date)), ...income.map(i => new Date(i.date))];
      const oldestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const newestDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      const daysDiff = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      
      analysis += `\n📅 **TIME ANALYSIS**\n`;
      analysis += `• Date Range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}\n`;
      analysis += `• Tracking Period: ${daysDiff} days\n`;
      
      if (daysDiff > 0) {
        const dailyAvgExpense = totalExpenses / daysDiff;
        const dailyAvgIncome = totalIncome / daysDiff;
        const weeklyAvgExpense = dailyAvgExpense * 7;
        const weeklyAvgIncome = dailyAvgIncome * 7;
        const monthlyProjectedExpense = dailyAvgExpense * 30;
        const monthlyProjectedIncome = dailyAvgIncome * 30;
        const yearlyProjectedExpense = dailyAvgExpense * 365;
        const yearlyProjectedIncome = dailyAvgIncome * 365;
        
        analysis += `• Daily Average Expense: ${formatCurrency(dailyAvgExpense)}\n`;
        analysis += `• Daily Average Income: ${formatCurrency(dailyAvgIncome)}\n`;
        analysis += `• Weekly Average Expense: ${formatCurrency(weeklyAvgExpense)}\n`;
        analysis += `• Weekly Average Income: ${formatCurrency(weeklyAvgIncome)}\n`;
        analysis += `• Monthly Projected Expense: ${formatCurrency(monthlyProjectedExpense)}\n`;
        analysis += `• Monthly Projected Income: ${formatCurrency(monthlyProjectedIncome)}\n`;
        analysis += `• Yearly Projected Expense: ${formatCurrency(yearlyProjectedExpense)}\n`;
        analysis += `• Yearly Projected Income: ${formatCurrency(yearlyProjectedIncome)}\n`;
        
        const monthlyNetSavings = monthlyProjectedIncome - monthlyProjectedExpense;
        const yearlyNetSavings = yearlyProjectedIncome - yearlyProjectedExpense;
        analysis += `• Monthly Projected Savings: ${formatCurrency(monthlyNetSavings)}\n`;
        analysis += `• Yearly Projected Savings: ${formatCurrency(yearlyNetSavings)}\n`;
      }
    }

    // Financial Health Score
    analysis += `\n🏥 **FINANCIAL HEALTH SCORE**\n`;
    let healthScore = 0;
    const maxScore = 100;
    const savingsRateNum = parseFloat(savingsRate);
    
    if (income.length > 0) healthScore += 20;
    if (expenses.length > 0) healthScore += 20;
    if (savingsRateNum >= 20) healthScore += 30;
    else if (savingsRateNum >= 10) healthScore += 20;
    else if (savingsRateNum >= 0) healthScore += 10;
    
    if (netSavings > 0) healthScore += 30;
    else if (netSavings > -totalIncome * 0.1) healthScore += 15;
    
    analysis += `• Health Score: ${healthScore}/${maxScore}\n`;
    if (healthScore >= 80) analysis += `• Status: Excellent financial health\n`;
    else if (healthScore >= 60) analysis += `• Status: Good financial health\n`;
    else if (healthScore >= 40) analysis += `• Status: Fair financial health\n`;
    else analysis += `• Status: Needs improvement\n`;

    return analysis;
  }

  private getGeneralKnowledgeResponse(query: string): string | null {
    const lowerQuery = query.toLowerCase();

    // Time and date
    if (lowerQuery.includes('time') || lowerQuery.includes('date')) {
      const now = new Date();
      return `🕐 It's currently ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`;
    }

    // Weather (simulated)
    if (lowerQuery.includes('weather')) {
      return `🌤️ I don't have access to real-time weather data, but you can check your local weather service. Would you like me to help you with something else?`;
    }

    // Math calculations
    if (lowerQuery.includes('calculate') || lowerQuery.includes('math') || /[\d+\-*/]/.test(query)) {
      try {
        const numbers = this.extractNumbers(query);
        if (numbers.length >= 2) {
          const expression = query.replace(/[^0-9+\-*/().]/g, '');
          const result = eval(expression);
          if (!isNaN(result)) {
            let calcResponse = `🔢 **Calculation Result**\n\n`;
            calcResponse += `• Expression: ${expression}\n`;
            calcResponse += `• Result: ${result}\n`;
            
            // Additional calculations
            if (numbers.length >= 2) {
              const sum = numbers.reduce((a, b) => a + b, 0);
              const product = numbers.reduce((a, b) => a * b, 1);
              const avg = sum / numbers.length;
              const max = Math.max(...numbers);
              const min = Math.min(...numbers);
              
              calcResponse += `\n📊 **Additional Statistics**\n`;
              calcResponse += `• Sum: ${sum}\n`;
              calcResponse += `• Product: ${product}\n`;
              calcResponse += `• Average: ${avg.toFixed(2)}\n`;
              calcResponse += `• Maximum: ${max}\n`;
              calcResponse += `• Minimum: ${min}\n`;
              calcResponse += `• Range: ${max - min}\n`;
            }
            
            return calcResponse;
          }
        }
      } catch {
        return `🔢 I couldn't calculate that. Please provide a clear mathematical expression like "25 * 4" or "100 + 50 - 20".`;
      }
    }

    // General knowledge
    const generalKnowledge: Record<string, string> = {
      'who are you': "I'm ExpenseAI, your intelligent financial assistant! I help you track expenses, manage income, and provide personalized financial insights - all while keeping your data private and local on your device. I can perform detailed financial analysis, calculations, and answer general questions.",
      'what can you do': "I can help you with:\n\n💰 Financial tracking (expenses & income)\n📊 Comprehensive spending analysis and insights\n💡 Money-saving tips and recommendations\n🎯 Budget planning and tracking\n📈 Financial health assessment\n🤖 General questions and calculations\n📜 Transaction history and details\n🔢 Mathematical calculations with statistics\n\nAll powered by local AI with no external services!",
      'how are you': "I'm functioning perfectly and ready to help! 🤖 All systems are operational and your data is secure and private. I'm continuously learning from your financial patterns to provide better insights.",
      'thank': "You're welcome! 😊 I'm always here to help with your financial questions. Is there anything else you'd like to know? I can provide detailed analysis, calculations, or answer any other questions you might have.",
      'good morning': "Good morning! ☀️ Hope you have a productive day! Ready to help you track your finances, provide detailed analysis, or answer any questions. How can I assist you today?",
      'good afternoon': "Good afternoon! 🌤️ How can I assist you with your finances today? I can provide comprehensive analysis, calculations, or help with any financial questions you might have.",
      'good evening': "Good evening! 🌙 Hope you had a great day. What can I help you with? I can provide detailed financial analysis, calculations, or answer any questions before you wrap up your day.",
      'joke': "Why don't scientists trust atoms? Because they make up everything! 😄\n\nWant a financial joke instead? Why did the dollar go to school? To get better cents! Or why do financial advisors never get lost? Because they always know their net worth!",
      'meaning of life': "According to Douglas Adams, the answer is 42. But in finance, the meaning of life is financial freedom and peace of mind! 💰✨\n\nFinancial freedom means having enough savings, investments, and cash to afford the lifestyle you desire. It's about making your money work for you, not the other way around.",
      'help': "I can provide detailed assistance with:\n\n📊 **Financial Analysis**: Comprehensive breakdowns of your income, expenses, savings, and financial health\n📜 **Transaction History**: View all your income and expense transactions with filters\n🔢 **Calculations**: Mathematical operations with detailed statistics\n💡 **Insights**: AI-powered recommendations based on your spending patterns\n📈 **Projections**: Monthly and yearly financial projections\n🏥 **Health Score**: Overall financial wellness assessment\n\nJust ask me anything! Try 'comprehensive analysis', 'show my history', 'calculate 25 * 4', or 'what's my financial health?'",
    };

    for (const [key, response] of Object.entries(generalKnowledge)) {
      if (lowerQuery.includes(key)) {
        return response;
      }
    }

    return null;
  }

  getResponse(input: string, expenses?: Expense[], income?: Income[]): { response: string; quickActions?: string[] } {
    if (expenses && income) {
      this.updateContext(expenses, income);
    }

    this.addToHistory(input);
    const lowerInput = input.toLowerCase();

    // Check for history queries
    if (this.fuzzyMatch(input, ['history', 'transaction history', 'show history', 'view history', 'recent transactions', 'past transactions'])) {
      return {
        response: this.getTransactionHistory('all', 10),
        quickActions: ['View expense history', 'View income history', 'View last 7 days']
      };
    }

    // Check for expense history queries
    if (this.fuzzyMatch(input, ['expense history', 'expense transactions', 'past expenses', 'spent history'])) {
      return {
        response: this.getTransactionHistory('expenses', 10),
        quickActions: ['View all history', 'View income history', 'Add expense']
      };
    }

    // Check for income history queries
    if (this.fuzzyMatch(input, ['income history', 'income transactions', 'past income', 'earned history'])) {
      return {
        response: this.getTransactionHistory('income', 10),
        quickActions: ['View all history', 'View expense history', 'Add income']
      };
    }

    // Check for recent transactions (last 7 days)
    if (this.fuzzyMatch(input, ['recent', 'last 7 days', 'this week', 'past week', 'last week'])) {
      return {
        response: this.getRecentTransactions(7),
        quickActions: ['View full history', 'View last 30 days', 'View today']
      };
    }

    // Check for last 30 days
    if (this.fuzzyMatch(input, ['last 30 days', 'this month', 'past month', 'last month'])) {
      return {
        response: this.getRecentTransactions(30),
        quickActions: ['View full history', 'View last 7 days', 'View today']
      };
    }

    // Check for today's transactions
    if (this.fuzzyMatch(input, ['today', 'todays transactions', 'today only'])) {
      return {
        response: this.getRecentTransactions(1),
        quickActions: ['View last 7 days', 'View last 30 days', 'View full history']
      };
    }

    // Check for comprehensive analysis queries
    if (this.fuzzyMatch(input, ['comprehensive', 'detailed', 'full analysis', 'complete', 'everything', 'all details', 'breakdown'])) {
      return {
        response: this.getComprehensiveFinancialAnalysis(),
        quickActions: ['View history', 'Get calculations', 'Financial health']
      };
    }

    // Check for financial queries
    if (this.fuzzyMatch(input, ['how much', 'total', 'spending', 'income', 'balance', 'savings', 'overview', 'summary', 'financial'])) {
      return {
        response: this.getComprehensiveFinancialAnalysis(),
        quickActions: ['View expenses', 'View income', 'Get insights']
      };
    }

    // Check for specific expense queries
    if (this.fuzzyMatch(input, ['expense', 'spent', 'cost'])) {
      const totalExpenses = this.financialContext.expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        response: `💰 You've spent ${formatCurrency(totalExpenses)} in total across ${this.financialContext.expenses.length} expense entries.\n\n${this.financialContext.expenses.length > 0 ? 'Would you like to see a breakdown by category?' : 'Add some expenses to start tracking!'}`,
        quickActions: ['View expense breakdown', 'Add expense', 'View history']
      };
    }

    // Check for income queries
    if (this.fuzzyMatch(input, ['income', 'earn', 'salary', 'revenue'])) {
      const totalIncome = this.financialContext.income.reduce((sum, i) => sum + i.amount, 0);
      return {
        response: `💵 You've earned ${formatCurrency(totalIncome)} in total across ${this.financialContext.income.length} income entries.\n\n${this.financialContext.income.length > 0 ? 'Your income helps you track your financial health!' : 'Add some income entries to start tracking!'}`,
        quickActions: ['View income breakdown', 'Add income', 'View income history']
      };
    }

    // Check for savings queries
    if (this.fuzzyMatch(input, ['save', 'saving', 'net', 'leftover'])) {
      const totalExpenses = this.financialContext.expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = this.financialContext.income.reduce((sum, i) => sum + i.amount, 0);
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';
      
      return {
        response: `💎 Your net savings: ${formatCurrency(netSavings)}\n\nSavings rate: ${savingsRate}%\n\n${netSavings > 0 ? '🎉 Great job saving money!' : netSavings < 0 ? '⚠️ You\'re spending more than you earn. Consider reviewing your expenses.' : '📊 You\'re breaking even. Try to save at least 20% of your income.'}`,
        quickActions: ['View spending tips', 'Set savings goal', 'Analyze expenses']
      };
    }

    // Check for general knowledge
    const generalResponse = this.getGeneralKnowledgeResponse(input);
    if (generalResponse) {
      return {
        response: generalResponse,
        quickActions: ['Ask about finances', 'View dashboard', 'Get help']
      };
    }

    // Default to helpful guidance
    const defaultResponses = [
      {
        response: "I understand you're asking about \"" + input + "\". While I specialize in financial tracking, I can help with:\n\n💰 Your expenses and income\n📊 Financial insights and analysis\n💡 Money-saving tips\n🧮 Calculations\n🕐 Time and date\n\nCould you rephrase your question or ask about your finances?",
        quickActions: ['View my finances', 'Add expense', 'Get insights']
      },
      {
        response: "I'm here to help! I can assist with:\n\n📊 **Financial tracking** - Expenses, income, savings\n💡 **Smart insights** - AI-powered analysis\n🧮 **Calculations** - Math and numbers\n🕐 **Time & date** - Current time information\n\nWhat would you like to know?",
        quickActions: ['View financial overview', 'Calculate something', 'Get time']
      }
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
}

export default function AIChatbot({ expenses = [], income = [] }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey there! 👋 I\'m ExpenseAI, your intelligent financial assistant.\n\nI can help you with:\n\n• 💰 Track expenses and income\n• 📊 Analyze your spending patterns\n• 💡 Get personalized financial insights\n• 🎯 Plan budgets and set goals\n• 🧮 Perform calculations\n• 📜 View transaction history\n\nWhat would you like to know today?',
      sender: 'bot',
      timestamp: new Date(),
      quickActions: ['How much did I spend?', 'What\'s my income?', 'Tell me a joke']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem('selectedVoice') || '';
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 384, height: 384 }); // w-96 = 384px, h-96 = 384px
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; width: number; height: number } | null>(null);
  const [aiModel, setAiModel] = useState<'local' | 'groq'>(() => {
    return (localStorage.getItem('aiModel') as 'local' | 'groq') || 'local';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const localAIRef = useRef(new LocalAI(expenses, income));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResizeStart = (direction: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeDirection(direction);
    setIsResizing(true);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: chatSize.width,
      height: chatSize.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection || !resizeStart) return;

      const minWidth = 300;
      const minHeight = 300;
      const maxWidth = window.innerWidth - 50;
      const maxHeight = window.innerHeight - 50;

      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      // Calculate new dimensions based on resize direction using delta
      if (resizeDirection.includes('e')) {
        newWidth = resizeStart.width + deltaX;
      }
      if (resizeDirection.includes('w')) {
        newWidth = resizeStart.width - deltaX;
      }
      if (resizeDirection.includes('s')) {
        newHeight = resizeStart.height + deltaY;
      }
      if (resizeDirection.includes('n')) {
        newHeight = resizeStart.height - deltaY;
      }

      // Apply constraints
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

      setChatSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      setResizeStart(null);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection, resizeStart]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInputValue(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
      
      // Load available voices
      const loadVoices = () => {
        const voices = synthesisRef.current?.getVoices() || [];
        setAvailableVoices(voices);
      };
      
      loadVoices();
      
      // Voices load asynchronously
      synthesisRef.current?.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        synthesisRef.current?.removeEventListener('voiceschanged', loadVoices);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setInputValue('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Set selected voice if available
    if (selectedVoice) {
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  };

  const handleVoiceSelect = (voiceName: string) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('selectedVoice', voiceName);
    setShowVoiceSelector(false);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  const getBotResponse = async (userMessage: string): Promise<{ response: string; quickActions?: string[] }> => {
    if (aiModel === 'groq') {
      const apiKey = localStorage.getItem('groqApiKey');
      if (!apiKey) {
        return {
          response: "To use Groq AI, please add your API key in Settings > AI Assistant Settings. You can get a free API key from Groq Console.",
          quickActions: ['Go to Settings', 'Use Local AI']
        };
      }

      try {
        // Prepare financial context
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
        const netSavings = totalIncome - totalExpenses;
        
        // Calculate spending patterns
        const expenseByCategory = expenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {} as Record<string, number>);
        
        const topExpenseCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
        const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';
        
        // Get recent transactions
        const recentExpenses = expenses.slice(-5).reverse();
        const recentIncome = income.slice(-3).reverse();
        
        const financialContext = `
=== YOUR FINANCIAL SNAPSHOT ===
💰 Total Income: ${formatCurrency(totalIncome)}
💸 Total Expenses: ${formatCurrency(totalExpenses)}
📊 Net Savings: ${formatCurrency(netSavings)}
📈 Savings Rate: ${savingsRate}%
🔥 Top Spending Category: ${topExpenseCategory ? `${topExpenseCategory[0]} (${formatCurrency(topExpenseCategory[1])})` : 'N/A'}
📝 Total Transactions: ${expenses.length + income.length}

=== RECENT ACTIVITY ===
Recent Expenses:
${recentExpenses.map(e => `• ${e.description}: ${formatCurrency(e.amount)} (${e.category})`).join('\n') || 'No recent expenses'}

Recent Income:
${recentIncome.map(i => `• ${i.description}: ${formatCurrency(i.amount)} (${i.category})`).join('\n') || 'No recent income'}

=== SPENDING BY CATEGORY ===
${Object.entries(expenseByCategory).map(([cat, amount]) => `• ${cat}: ${formatCurrency(amount)}`).join('\n') || 'No expenses yet'}
`;

        const systemPrompt = `You are ExpenseAI, a sophisticated and friendly financial assistant with a warm, conversational personality. Think of yourself as a smart, helpful financial companion who genuinely cares about the user's financial well-being.

=== YOUR PERSONALITY ===
- Be warm, friendly, and conversational (like a helpful friend, not a robot)
- Use emojis occasionally to add warmth and visual appeal
- Be proactive in offering insights and suggestions
- Show genuine interest in their financial journey
- Be encouraging and positive, even when discussing challenges
- Use natural, conversational language (avoid being overly formal)
- Ask follow-up questions when appropriate to better understand their needs
- Celebrate their financial wins and progress

=== YOUR KNOWLEDGE ===
${financialContext}

=== YOUR GUIDELINES ===
1. When discussing their finances, reference specific numbers from their data
2. Offer personalized insights based on their spending patterns
3. Suggest practical, actionable advice tailored to their situation
4. If they ask general questions, answer helpfully but relate it back to their finances when relevant
5. Be concise but thorough - don't ramble, but don't be too brief either
6. Use markdown formatting (bold, lists, etc.) for better readability
7. If their savings rate is low, gently suggest ways to improve it
8. If they have high spending in a category, offer specific tips to reduce it
9. Be honest about limitations - if you don't have enough data, say so
10. End with a relevant question or suggestion to keep the conversation going

=== EXAMPLE RESPONSE STYLE ===
Instead of: "Your total expenses are $5000."
Say: "I can see you've spent $5,000 this month! 🎯 Your biggest expense seems to be dining out. Would you like some tips on how to cut back on restaurant spending?"

Instead of: "Your savings rate is 20%."
Say: "Great news! You're saving 20% of your income - that's above the recommended 15-20%! 🎉 Keep up the excellent work. Have you thought about investing some of those savings?"

Remember: You're not just answering questions - you're having a conversation and helping them improve their financial life.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error('Groq API error response:', data);
          const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const botResponse = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
        
        return {
          response: botResponse,
          quickActions: ['View financial overview', 'Ask another question', 'Get insights']
        };
      } catch (error: any) {
        console.error('Groq API error:', error);
        const errorMessage = error.message || 'Unknown error';
        return {
          response: `I encountered an error connecting to Groq: ${errorMessage}\n\nPlease check:\n1. Your API key is correct\n2. You have internet connection\n3. The API key has the necessary permissions\n\nOr try using the Local AI model instead.`,
          quickActions: ['Check API Key', 'Use Local AI']
        };
      }
    } else {
      // Use local AI
      return localAIRef.current.getResponse(userMessage, expenses, income);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const responseData = await getBotResponse(inputValue);
      
      // Create a streaming bot message
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        quickActions: responseData.quickActions,
        isStreaming: true
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      
      // Stream the response character by character
      let currentIndex = 0;
      const streamText = () => {
        if (currentIndex < responseData.response.length) {
          const charsToAdd = Math.min(3, responseData.response.length - currentIndex);
          const newText = responseData.response.substring(0, currentIndex + charsToAdd);
          
          setMessages(prev => prev.map(msg => 
            msg.id === botResponse.id ? { ...msg, text: newText } : msg
          ));
          
          currentIndex += charsToAdd;
          setTimeout(streamText, 15 + Math.random() * 20); // Random delay for natural typing
        } else {
          // Streaming complete
          setMessages(prev => prev.map(msg => 
            msg.id === botResponse.id ? { ...msg, isStreaming: false } : msg
          ));
          
          // Speak the bot response
          if (voiceEnabled) {
            speak(responseData.response);
          }
        }
      };
      
      streamText();
    } catch (error) {
      console.error('Error getting bot response:', error);
      setIsTyping(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    handleSendMessage();
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, helpful } : msg
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
          <span className="absolute -top-12 right-0 bg-slate-800 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Need help?
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-purple-500/50 rounded-2xl shadow-2xl"
          style={{ 
            width: `${chatSize.width}px`,
            height: `${chatSize.height}px`,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4 flex items-center justify-between relative z-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">ExpenseAI Assistant</h3>
                <p className="text-white/90 text-xs font-medium">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-white/90 transition-colors p-3 hover:bg-white/10 rounded-xl bg-white/5 shadow-lg border border-white/20"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Resize Handles */}
          <div 
            className="absolute bottom-0 right-0 w-10 h-10 cursor-se-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('se', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 border-r-3 border-b-3 border-white rounded-br-lg" />
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-0 w-10 h-10 cursor-sw-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('sw', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 border-l-3 border-b-3 border-white rounded-bl-lg" />
            </div>
          </div>
          <div 
            className="absolute top-0 right-0 w-10 h-10 cursor-ne-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('ne', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-5 h-5 border-r-3 border-t-3 border-white rounded-tr-lg" />
            </div>
          </div>
          <div 
            className="absolute top-0 left-0 w-16 h-16 cursor-nw-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('nw', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
            </div>
          </div>
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-8 cursor-n-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('n', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-1 bg-white rounded-full" />
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-8 cursor-s-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('s', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-1 bg-white rounded-full" />
            </div>
          </div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-20 cursor-w-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('w', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-1 h-10 bg-white rounded-full" />
            </div>
          </div>
          <div 
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-20 cursor-e-resize z-[100] hover:bg-purple-500/70 transition-colors"
            onMouseDown={(e) => handleResizeStart('e', e)}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-1 h-10 bg-white rounded-full" />
            </div>
          </div>

          {/* Messages */}
          <div 
            className="overflow-y-auto p-4 space-y-4 bg-slate-800"
            style={{ height: `${chatSize.height - 180}px` }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[85%] ${message.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                        : 'bg-slate-700 text-white border border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === 'bot' && (
                        <div className="flex-shrink-0">
                          <Bot className="w-4 h-4 mt-0.5 text-teal-400" />
                          {message.isStreaming && (
                            <span className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse ml-1"></span>
                          )}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      {message.sender === 'user' && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    </div>
                  </div>
                  
                  {/* Message actions */}
                  <div className={`flex items-center gap-2 mt-1 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
                    {message.sender === 'bot' && !message.isStreaming && (
                      <>
                        <button
                          onClick={() => handleCopyMessage(message.text)}
                          className="text-slate-400 hover:text-teal-400 transition-colors"
                          title="Copy message"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, true)}
                          className={`transition-colors ${message.helpful === true ? 'text-green-400' : 'text-slate-400 hover:text-green-400'}`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, false)}
                          className={`transition-colors ${message.helpful === false ? 'text-red-400' : 'text-slate-400 hover:text-red-400'}`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Quick actions */}
                  {message.sender === 'bot' && !message.isStreaming && message.quickActions && message.quickActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action)}
                          className="text-xs bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 px-3 py-1.5 rounded-full border border-teal-500/30 transition-all hover:scale-105"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-slate-700 border border-slate-600 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-teal-400" />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-700 border-t border-slate-600">
            <div className="flex gap-2 items-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-2 ring-red-300' 
                    : 'bg-slate-600 hover:bg-slate-500 text-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                className={`flex-1 bg-slate-600 border border-slate-500 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${isListening ? 'border-cyan-400 ring-2 ring-cyan-400/20' : ''}`}
              />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                    className="p-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-white transition-all"
                    title="Select voice"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  {showVoiceSelector && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-700 border border-slate-600 rounded-xl shadow-xl p-3 max-h-64 overflow-y-auto">
                      <p className="text-xs text-slate-400 mb-2 font-medium">Select Voice</p>
                      {availableVoices.length > 0 ? (
                        availableVoices.map((voice, index) => (
                          <button
                            key={index}
                            onClick={() => handleVoiceSelect(voice.name)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                              selectedVoice === voice.name
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            <div className="font-medium">{voice.name}</div>
                            <div className="text-slate-400">{voice.lang}</div>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No voices available</p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleVoice}
                  className={`p-3 rounded-xl transition-all ${
                    voiceEnabled 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : 'bg-slate-600 hover:bg-slate-500 text-slate-400'
                  }`}
                  title={voiceEnabled ? 'AI Voice: ON' : 'AI Voice: OFF'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4">
                <p className="text-xs text-slate-400">
                  Powered by AI • Your data stays local
                </p>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-600 rounded-lg">
                  <span className="text-xs text-slate-300">AI Voice:</span>
                  <button
                    onClick={toggleVoice}
                    className={`text-xs font-semibold px-2 py-0.5 rounded transition-all ${
                      voiceEnabled 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-500 text-slate-400'
                    }`}
                  >
                    {voiceEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isListening && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium animate-pulse">Listening...</span>
                  </div>
                )}
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-purple-400">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium animate-pulse">Speaking...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
