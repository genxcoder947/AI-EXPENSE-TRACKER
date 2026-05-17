import { useState, useEffect } from 'react';
import { Expense } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { InsightsPanel } from './components/InsightsPanel';
import { SpendingChart } from './components/SpendingChart';
import { StatsOverview } from './components/StatsOverview';
import { generateInsights, calculateCategoryTotals } from './utils/aiEngine';
import { sortExpensesByDate } from './utils/helpers';
import { CategoryPieChart } from './components/CategoryPieChart';
import { Sparkles, Moon, Sun } from 'lucide-react';
import Login from './components/auth/Login';
import { getCurrentUser, loginUser, logout, registerUser } from './lib/auth';

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const handleLogin = (email: string, password: string) => {
    const user = loginUser(email, password);
    if (user) {
      setUser(user);
      // Clear expenses for new user
      setExpenses([]);
    } else {
      // In a real app, we would show an error
      alert('Invalid credentials');
    }
  };

  const handleSignUp = (email: string, password: string) => {
    const newUser = registerUser(email, password);
    if (newUser) {
      setUser(newUser);
      // Clear expenses for new user
      setExpenses([]);
    } else {
      alert('User already exists with this email');
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    // Clear expenses on logout
    setExpenses([]);
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => sortExpensesByDate([expense, ...prev]));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(prev =>
      sortExpensesByDate(prev.map(expense => (
        expense.id === updatedExpense.id ? updatedExpense : expense
      )))
    );
  };

  const insights = generateInsights(expenses);
  const categoryTotals = calculateCategoryTotals(expenses);

  // If no user, show login page
  if (!user) {
    return <Login onLogin={handleLogin} onSignUp={handleSignUp} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
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
              <button onClick={toggleTheme} className="p-2 rounded bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-50">
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-yellow-400" />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded bg-red-100 text-red-700 dark:bg-red-200 dark:text-red-800 hover:bg-red-200 dark:hover:bg-red-300">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="mb-8">
          <StatsOverview expenses={expenses} />
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
      </main>
    </div>
  );
}
