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
import { sortExpensesByDate } from './utils/helpers';
import { CategoryPieChart } from './components/CategoryPieChart';
import { Sparkles, Moon, Sun } from 'lucide-react';
import Login from './components/auth/Login';
import AIChatbot from './components/AIChatbot';
import Sidebar from './components/Sidebar';
import ExpenseTimelineGraph from './components/ExpenseTimelineGraph';
import AccountSettings from './components/AccountSettings';
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

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

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

  const insights = generateInsights(expenses);
  const categoryTotals = calculateCategoryTotals(expenses);

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
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
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
                <StatsOverview expenses={expenses} />
              </div>

              {/* Income Overview */}
              <div className="mb-8">
                <IncomeOverview income={income} />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  <ExpenseForm onAddExpense={handleAddExpense} />
                  <ExpenseList
                    expenses={expenses}
                    onDeleteExpense={handleDeleteExpense}
                    onUpdateExpense={handleUpdateExpense}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <InsightsPanel insights={insights} />
                  <SpendingChart categoryTotals={categoryTotals} />
                  <CategoryPieChart expenses={expenses} />
                </div>
              </div>
            </>
          )}

          {currentView === 'add-expense' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Add New Expense</h2>
              <ExpenseForm onAddExpense={handleAddExpense} />
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
              <ExpenseList
                expenses={expenses}
                onDeleteExpense={handleDeleteExpense}
                onUpdateExpense={handleUpdateExpense}
              />
            </div>
          )}

          {currentView === 'income-history' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Income History</h2>
              <IncomeList
                income={income}
                onDeleteIncome={handleDeleteIncome}
                onUpdateIncome={handleUpdateIncome}
                isDarkMode={darkMode}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Analytics</h2>
              <ExpenseTimelineGraph expenses={expenses} isDarkMode={darkMode} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendingChart categoryTotals={categoryTotals} />
                <CategoryPieChart expenses={expenses} />
              </div>
            </div>
          )}

          {currentView === 'insights' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">AI Insights</h2>
              <InsightsPanel insights={insights} />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Account Settings</h2>
              <AccountSettings
                userEmail={user?.email || ''}
                userCreatedAt={user?.createdAt || ''}
                totalExpenses={expenses.reduce((sum, e) => sum + e.amount, 0)}
                totalIncome={income.reduce((sum, i) => sum + i.amount, 0)}
                expenseCount={expenses.length}
                incomeCount={income.length}
                isDarkMode={darkMode}
                onLogout={() => void handleLogout()}
              />
            </div>
          )}
        </main>

        {/* AI Chatbot */}
        <AIChatbot expenses={expenses} income={income} />
      </div>
    </div>
  );
}
