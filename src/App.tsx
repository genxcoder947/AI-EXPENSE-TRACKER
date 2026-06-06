import { useState, useEffect } from 'react';
import { Expense, Income } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { IncomeForm } from './components/IncomeForm';
import { IncomeList } from './components/IncomeList';
import { IncomeOverview } from './components/IncomeOverview';
import { InsightsPanel } from './components/InsightsPanel';
import { SpendingChart } from './components/SpendingChart';
import { StatsOverview } from './components/StatsOverview';
import { generateInsights, calculateCategoryTotals } from './utils/aiEngine';
import { getPreferredCurrency, setPreferredCurrency, sortExpensesByDate, convertAmount } from './utils/helpers';
import { CategoryPieChart } from './components/CategoryPieChart';
import { Sparkles, Moon, Sun, RefreshCw, Search } from 'lucide-react';
import Login from './components/auth/Login';
import AIChatbot from './components/AIChatbot';
import Sidebar from './components/Sidebar';
import ExpenseTimelineGraph from './components/ExpenseTimelineGraph';
import AccountSettings from './components/AccountSettings';
import { QuickSummary } from './components/QuickSummary';
import { BudgetProgressTracker } from './components/BudgetProgressTracker';
import { MonthlyComparison } from './components/MonthlyComparison';
import { SavingsGoalProgress } from './components/SavingsGoalProgress';
import { QuickActions } from './components/QuickActions';
import {
  type ApiUser,
  clearStoredSession,
  createExpense,
  deleteExpense,
  fetchCurrentUser,
  fetchExpenses,
  fetchIncome,
  createIncome,
  deleteIncome,
  updateIncome,
  getErrorMessage,
  hasStoredSession,
  login,
  logout,
  register,
  updateExpense,
} from './lib/api';

type View = 'dashboard' | 'add-expense' | 'add-income' | 'history' | 'income-history' | 'analytics' | 'insights' | 'settings';

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [currency, setCurrency] = useState(getPreferredCurrency);
  const [displayExpenses, setDisplayExpenses] = useState<Expense[]>([]);
  const [displayIncome, setDisplayIncome] = useState<Income[]>([]);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const handleCurrencyChange = (newCurrency: string) => {
    setPreferredCurrency(newCurrency);
    setCurrency(newCurrency);
  };

  // Convert expenses and income for display when currency changes
  useEffect(() => {
    const convertForDisplay = async () => {
      console.log('Currency changed to:', currency);
      console.log('Original expenses:', expenses);
      console.log('Original income:', income);
      
      if (currency === 'INR') {
        console.log('Using original amounts (INR)');
        setDisplayExpenses(expenses);
        setDisplayIncome(income);
      } else {
        try {
          console.log('Converting amounts from INR to', currency);
          const convertedExp = await Promise.all(
            expenses.map(async (exp) => ({
              ...exp,
              amount: await convertAmount(exp.amount, 'INR', currency)
            }))
          );
          const convertedInc = await Promise.all(
            income.map(async (inc) => ({
              ...inc,
              amount: await convertAmount(inc.amount, 'INR', currency)
            }))
          );
          console.log('Converted expenses:', convertedExp);
          console.log('Converted income:', convertedInc);
          setDisplayExpenses(convertedExp);
          setDisplayIncome(convertedInc);
        } catch (error) {
          console.error('Currency conversion error:', error);
          // Fallback to original amounts if conversion fails
          setDisplayExpenses(expenses);
          setDisplayIncome(income);
        }
      }
    };
    convertForDisplay();
  }, [expenses, income, currency]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!hasStoredSession()) {
        setInitializing(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        const savedExpenses = await fetchExpenses();
        const savedIncome = await fetchIncome();
        if (!cancelled) {
          setUser(currentUser);
          setExpenses(sortExpensesByDate(savedExpenses));
          setIncome(savedIncome);
        }
      } catch (err) {
        clearStoredSession();
        if (!cancelled) {
          setUser(null);
          setExpenses([]);
          setIncome([]);
          setAppError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const loadUserExpenses = async () => {
    const savedExpenses = await fetchExpenses();
    setExpenses(sortExpensesByDate(savedExpenses));
  };

  const loadUserIncome = async () => {
    const savedIncome = await fetchIncome();
    setIncome(savedIncome);
  };

  const handleLogin = async (email: string, password: string) => {
    const session = await login(email, password);
    setUser(session.user);
    await loadUserExpenses();
    await loadUserIncome();
    setAppError(null);
  };

  const handleSignUp = async (email: string, password: string) => {
    const session = await register(email, password);
    setUser(session.user);
    await loadUserExpenses();
    await loadUserIncome();
    setAppError(null);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setExpenses([]);
    setIncome([]);
  };

  const handleAddExpense = async (expense: Expense) => {
    const savedExpense = await createExpense({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes,
      aiSuggested: expense.aiSuggested,
    });
    setExpenses(prev => sortExpensesByDate([savedExpense, ...prev]));
  };

  const handleAddIncome = async (income: Income) => {
    const savedIncome = await createIncome({
      description: income.description,
      amount: income.amount,
      category: income.category,
      date: income.date,
      notes: income.notes,
    });
    setIncome(prev => [savedIncome, ...prev]);
  };

  const handleUpdateIncome = async (income: Income) => {
    const updatedIncome = await updateIncome(income);
    setIncome(prev => prev.map(inc => inc.id === updatedIncome.id ? updatedIncome : inc));
  };

  const handleDeleteIncome = async (id: string) => {
    await deleteIncome(id);
    setIncome(prev => prev.filter(inc => inc.id !== id));
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    const savedExpense = await updateExpense(updatedExpense);
    setExpenses(prev =>
      sortExpensesByDate(prev.map(expense => (
        expense.id === savedExpense.id ? savedExpense : expense
      )))
    );
  };

  const insights = generateInsights(displayExpenses, displayIncome);
  const categoryTotals = calculateCategoryTotals(displayExpenses);
  
  // Filter expenses based on search query
  const filteredExpenses = displayExpenses.filter(expense =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (expense.notes && expense.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRefreshInsights = () => {
    setIsRefreshingInsights(true);
    // Force re-generation of insights by using a timestamp or similar mechanism
    setTimeout(() => {
      setIsRefreshingInsights(false);
    }, 500);
  };

  // Auto-refresh insights when expenses change
  useEffect(() => {
    handleRefreshInsights();
  }, [displayExpenses]);

  if (initializing) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Opening ExpenseAI...</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Checking your backend session</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {appError && (
          <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            {appError}
          </div>
        )}
        <Login
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onPasswordReset={async () => {
            const currentUser = await fetchCurrentUser();
            const savedExpenses = await fetchExpenses();
            const savedIncome = await fetchIncome();
            setUser(currentUser);
            setExpenses(sortExpensesByDate(savedExpenses));
            setIncome(savedIncome);
            setAppError(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isDarkMode={darkMode}
        userEmail={user?.email || ''}
        onLogout={() => void handleLogout()}
        sidebarWidth={sidebarWidth}
        onSidebarWidthChange={setSidebarWidth}
      />

      {/* Main Content */}
      <div 
        className={`transition-all duration-300`}
        style={{ marginLeft: isSidebarCollapsed ? '64px' : `${sidebarWidth}px` }}
      >
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">ExpenseAI</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Smart expense tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-200 dark:text-emerald-800 text-xs font-medium rounded-full">
                  {expenses.length} expenses
                </span>
                <button onClick={toggleTheme} className="p-2 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">
                  {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-yellow-400" />}
                </button>
                <button onClick={() => void handleLogout()} className="p-2 rounded bg-red-100 text-red-700 dark:bg-rose-900/40 dark:text-rose-200 hover:bg-red-200 dark:hover:bg-rose-900/60">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {currentView === 'dashboard' && (
            <>
              {/* Stats Overview */}
              <div className="mb-8">
                <StatsOverview expenses={displayExpenses} currency={currency} />
              </div>

              {/* Income Overview */}
              <div className="mb-8">
                <IncomeOverview income={displayIncome} currency={currency} />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search expenses by description, category, or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 text-base border border-slate-300 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <ExpenseForm onAddExpense={handleAddExpense} currency={currency} />
                  <ExpenseList
                    expenses={filteredExpenses}
                    onDeleteExpense={handleDeleteExpense}
                    onUpdateExpense={handleUpdateExpense}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <InsightsPanel insights={insights} onRefresh={handleRefreshInsights} isRefreshing={isRefreshingInsights} />
                  <SpendingChart categoryTotals={categoryTotals} />
                  <CategoryPieChart expenses={displayExpenses} />
                </div>
              </div>
            </>
          )}

          {currentView === 'add-expense' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Add New Expense</h2>
              <ExpenseForm onAddExpense={handleAddExpense} currency={currency} />
            </div>
          )}

          {currentView === 'add-income' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Add New Income</h2>
              <IncomeForm onAddIncome={handleAddIncome} />
            </div>
          )}

          {currentView === 'history' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Expense History</h2>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search expenses by description, category, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-base border border-slate-300 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <ExpenseList
                expenses={filteredExpenses}
                onDeleteExpense={handleDeleteExpense}
                onUpdateExpense={handleUpdateExpense}
              />
            </div>
          )}

          {currentView === 'income-history' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Income History</h2>
              <IncomeList
                income={displayIncome}
                onDeleteIncome={handleDeleteIncome}
                onUpdateIncome={handleUpdateIncome}
                isDarkMode={darkMode}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Analytics</h2>
              <ExpenseTimelineGraph expenses={displayExpenses} isDarkMode={darkMode} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendingChart categoryTotals={categoryTotals} />
                <CategoryPieChart expenses={displayExpenses} />
              </div>
            </div>
          )}

          {currentView === 'insights' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">AI Insights</h2>
                <button
                  onClick={handleRefreshInsights}
                  disabled={isRefreshingInsights}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh insights"
                >
                  <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <QuickSummary expenses={displayExpenses} income={displayIncome} currency={currency} />
                <BudgetProgressTracker expenses={displayExpenses} currency={currency} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <MonthlyComparison expenses={displayExpenses} currency={currency} />
                <SavingsGoalProgress expenses={displayExpenses} income={displayIncome} currency={currency} />
                <QuickActions 
                  onAddExpense={() => setCurrentView('add-expense')}
                  onAddIncome={() => setCurrentView('add-income')}
                  onViewAnalytics={() => setCurrentView('analytics')}
                  onViewInsights={() => setCurrentView('insights')}
                  onSettings={() => setCurrentView('settings')}
                />
              </div>
              
              <InsightsPanel insights={insights} onRefresh={handleRefreshInsights} isRefreshing={isRefreshingInsights} />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Account Settings</h2>
              <AccountSettings
                userEmail={user?.email || ''}
                userCreatedAt={user?.createdAt || ''}
                totalExpenses={displayExpenses.reduce((sum, e) => sum + e.amount, 0)}
                totalIncome={displayIncome.reduce((sum, i) => sum + i.amount, 0)}
                expenseCount={expenses.length}
                incomeCount={income.length}
                isDarkMode={darkMode}
                onLogout={handleLogout}
                onCurrencyChange={handleCurrencyChange}
                currentCurrency={currency}
                onThemeToggle={() => setDarkMode(!darkMode)}
              />
            </div>
          )}
        </main>

        {/* AI Chatbot */}
        <AIChatbot expenses={displayExpenses} income={displayIncome} />
      </div>
    </div>
  );
}
