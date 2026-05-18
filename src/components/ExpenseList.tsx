import { useState } from 'react';
import { Expense } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Check, NotebookText, Pencil, Sparkles, Trash2, X } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => Promise<void>;
  onUpdateExpense: (expense: Expense) => Promise<void>;
}

type ExpenseDraft = {
  description: string;
  amount: string;
  category: string;
  date: string;
  notes: string;
};

const categoryIcons: Record<string, string> = {
  'Food & Dining': '🍽️',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Bills & Utilities': '💡',
  'Healthcare': '🏥',
  'Education': '📚',
  'Travel': '✈️',
  'Other': '📦'
};

const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Other'
];

export function ExpenseList({ expenses, onDeleteExpense, onUpdateExpense }: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const startEditing = (expense: Expense) => {
    setEditingId(expense.id);
    setDraft({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      notes: expense.notes || '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEditing = async (expense: Expense) => {
    if (!draft || !draft.description.trim() || !draft.amount) return;

    const parsedAmount = Number(draft.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const trimmedNotes = draft.notes.trim();
    setActionError(null);
    setPendingId(expense.id);
    try {
      await onUpdateExpense({
        ...expense,
        description: draft.description.trim(),
        amount: parsedAmount,
        category: draft.category,
        date: draft.date,
        notes: trimmedNotes || undefined,
        aiSuggested: false,
      });
      cancelEditing();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the expense.');
    } finally {
      setPendingId(null);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    setActionError(null);
    setPendingId(expense.id);
    try {
      await onDeleteExpense(expense.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete the expense.');
    } finally {
      setPendingId(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-slate-500 font-medium">No expenses yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first expense above</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800">Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {actionError && (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {actionError}
          </div>
        )}
        <div className="divide-y divide-slate-100">
          {expenses.map((expense) => {
            const isEditing = editingId === expense.id && draft;

            if (isEditing) {
              return (
                <div key={expense.id} className="p-4 bg-emerald-50/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={draft.amount}
                      onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                      placeholder="Amount"
                    />
                    <Input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      placeholder="Optional notes"
                      maxLength={700}
                      rows={4}
                      className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 caret-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:col-span-2"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditing(expense)}
                      disabled={pendingId === expense.id}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {pendingId === expense.id ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={expense.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0">
                    {categoryIcons[expense.category] || '📦'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 truncate">{expense.description}</p>
                      {expense.aiSuggested && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{expense.category}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">{formatDate(expense.date)}</span>
                    </div>
                    {expense.notes && (
                      <p className="mt-1 flex max-w-xl items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                        <NotebookText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="line-clamp-2">{expense.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-slate-800">{formatCurrency(expense.amount)}</span>
                  <button
                    type="button"
                    onClick={() => startEditing(expense)}
                    disabled={pendingId === expense.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all focus:opacity-100"
                    aria-label={`Edit ${expense.description}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteExpense(expense)}
                    disabled={pendingId === expense.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all focus:opacity-100"
                    aria-label={`Delete ${expense.description}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
