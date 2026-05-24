import { useState } from 'react';
import { Income } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, Edit2, TrendingUp, Search, X } from 'lucide-react';
import { Input } from './ui/input';

interface IncomeListProps {
  income: Income[];
  onDeleteIncome: (id: string) => Promise<void>;
  onUpdateIncome: (income: Income) => Promise<void>;
  isDarkMode: boolean;
}

export function IncomeList({ income, onDeleteIncome, onUpdateIncome, isDarkMode }: IncomeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Income>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredIncome = income.filter(
    (inc) =>
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (inc: Income) => {
    setEditingId(inc.id);
    setEditForm({ ...inc });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.description || !editForm.amount) return;

    setIsUpdating(true);
    try {
      await onUpdateIncome({
        id: editingId,
        description: editForm.description,
        amount: editForm.amount,
        category: editForm.category || 'Other',
        date: editForm.date || new Date().toISOString().split('T')[0],
        notes: editForm.notes,
      });
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Failed to update income:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this income entry?')) {
      await onDeleteIncome(id);
    }
  };

  const totalIncome = filteredIncome.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Income History
          </CardTitle>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncome)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search income..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {filteredIncome.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {searchQuery ? 'No income found matching your search.' : 'No income entries yet.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredIncome.map((inc) => (
              <div
                key={inc.id}
                className={`p-4 rounded-lg border ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                } transition-colors`}
              >
                {editingId === inc.id ? (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Description"
                      className="w-full"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.amount || ''}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                      placeholder="Amount"
                      className="w-full"
                    />
                    <Input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Category"
                      className="w-full"
                    />
                    <Input
                      type="date"
                      value={editForm.date || ''}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isUpdating}
                        className="bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={handleCancelEdit} className="text-sm px-3 py-1 border border-slate-300">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white">{inc.description}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {inc.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatDate(inc.date)}
                        {inc.notes && ` • ${inc.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(inc.amount)}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleEdit(inc)}
                          className="p-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(inc.id)}
                          className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
