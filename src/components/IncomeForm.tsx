import { type FormEvent, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Income } from '../types';
import { generateId, getTodayString } from '../utils/helpers';
import { Plus, DollarSign } from 'lucide-react';

interface IncomeFormProps {
  onAddIncome: (income: Income) => Promise<void>;
}

const incomeCategories = [
  'Salary',
  'Freelance',
  'Investments',
  'Business',
  'Gift',
  'Other'
];

export function IncomeForm({ onAddIncome }: IncomeFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!description.trim()) {
      setSubmitError('Description is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setSubmitError('Amount must be greater than zero');
      return;
    }

    setIsSaving(true);

    try {
      const newIncome: Income = {
        id: generateId(),
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        date,
        notes: notes.trim() || undefined,
      };

      await onAddIncome(newIncome);

      // Reset form
      setDescription('');
      setAmount('');
      setCategory('Salary');
      setDate(getTodayString());
      setNotes('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to add income');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Add Income
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="income-description">Description</Label>
              <Input
                id="income-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly salary"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="income-amount">Amount</Label>
              <Input
                id="income-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="income-category">Category</Label>
              <select
                id="income-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {incomeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="income-date">Date</Label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="income-notes">Notes (optional)</Label>
            <Input
              id="income-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              disabled={isSaving}
            />
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isSaving}>
            {isSaving ? (
              'Adding...'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
