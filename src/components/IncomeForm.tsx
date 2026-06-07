import { type FormEvent, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Income } from '../types';
import { generateId, getTodayString } from '../utils/helpers';
import { Plus, DollarSign, Briefcase, TrendingUp, Gift, Building2, Zap, Repeat, Target } from 'lucide-react';

interface IncomeFormProps {
  onAddIncome: (income: Income) => Promise<void>;
}

const incomeCategories = [
  { name: 'Salary', icon: Briefcase, color: 'bg-blue-500' },
  { name: 'Freelance', icon: TrendingUp, color: 'bg-purple-500' },
  { name: 'Investments', icon: Building2, color: 'bg-green-500' },
  { name: 'Business', icon: Zap, color: 'bg-orange-500' },
  { name: 'Gift', icon: Gift, color: 'bg-pink-500' },
  { name: 'Other', icon: DollarSign, color: 'bg-slate-500' }
];

const incomeFrequencies = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const quickTemplates = [
  { name: 'Monthly Salary', category: 'Salary', amount: '' },
  { name: 'Freelance Payment', category: 'Freelance', amount: '' },
  { name: 'Investment Return', category: 'Investments', amount: '' },
  { name: 'Business Income', category: 'Business', amount: '' }
];

export function IncomeForm({ onAddIncome }: IncomeFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState('one-time');
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateClick = (template: typeof quickTemplates[0]) => {
    setDescription(template.name);
    setCategory(template.category);
    if (template.amount) setAmount(template.amount);
    setShowTemplates(false);
  };

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
      setFrequency('one-time');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to add income');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategory = incomeCategories.find(cat => cat.name === category);

  return (
    <Card className="w-full bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-slate-900 border-2 border-green-200 dark:border-green-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-white">
          <DollarSign className="w-6 h-6" />
          Add Income
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          {/* Quick Templates */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Quick Templates
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickTemplates.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleTemplateClick(template)}
                  className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="income-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
              <Input
                id="income-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly salary"
                disabled={isSaving}
                className="mt-1 border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <Label htmlFor="income-amount" className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isSaving}
                  className="pl-10 border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Category Selection with Icons */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {incomeCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${cat.color} text-white border-transparent`
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency Selector */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Frequency
            </Label>
            <div className="flex gap-2">
              {incomeFrequencies.map((freq) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setFrequency(freq.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    frequency === freq.value
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700'
                  }`}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="income-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">Date</Label>
            <Input
              id="income-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              className="mt-1 border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <Label htmlFor="income-notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</Label>
            <Input
              id="income-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              disabled={isSaving}
              className="mt-1 border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg transition-all" 
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Income
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
