import { type FormEvent, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ReceiptScanPanel, type ReceiptScanResult } from './ReceiptScanPanel';
import { suggestCategory } from '../utils/aiEngine';
import { generateId, getCurrencySymbol, getTodayString } from '../utils/helpers';
import { AiSuggestion, Expense } from '../types';
import { Check, Info, Lightbulb, Sparkles } from 'lucide-react';

interface ExpenseFormProps {
  onAddExpense: (expense: Expense) => Promise<void>;
  currency: string;
}

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

export function ExpenseForm({ onAddExpense, currency }: ExpenseFormProps) {
  const currencySymbol = getCurrencySymbol();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');
  const [tax, setTax] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [filledFromScan, setFilledFromScan] = useState(false);
  const [scanHints, setScanHints] = useState<{
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
    itemCount: number;
  } | null>(null);

  const clearScanContext = () => {
    setScanHints(null);
    setFilledFromScan(false);
  };

  const applyScanResult = (result: ReceiptScanResult) => {
    setDescription(result.description);
    setAmount(result.amount || '');
    setTax(result.taxInfo?.totalTax?.toString() || '');
    setNotes(result.notes || '');
    setScanHints({ confidence: result.confidence, warnings: result.warnings, itemCount: result.itemCount });
    setFilledFromScan(true);
    if (result.description.length > 2) {
      setIsAnalyzing(true);
      setTimeout(() => {
        setAiSuggestion(suggestCategory(result.description));
        setIsAnalyzing(false);
      }, 200);
    } else {
      setAiSuggestion(null);
    }
  };

  const handleDescriptionChange = (value: string) => {
    clearScanContext();
    setDescription(value);
    if (value.length > 2) {
      setIsAnalyzing(true);
      // Simulate AI processing delay
      setTimeout(() => {
        const suggestion = suggestCategory(value);
        setAiSuggestion(suggestion);
        setIsAnalyzing(false);
      }, 300);
    } else {
      setAiSuggestion(null);
    }
  };

  const applyAiSuggestion = () => {
    if (aiSuggestion) {
      setCategory(aiSuggestion.category);
      setAiSuggestion(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount || isSaving) return;

    const autoCat = suggestCategory(description);
    const trimmedNotes = notes.trim();
    const expense: Expense = {
      id: generateId(),
      description,
      amount: parseFloat(amount),
      category,
      date,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      ...(tax ? { tax: parseFloat(tax) } : {}),
      aiSuggested: filledFromScan || autoCat.category === category,
    };

    setSubmitError(null);
    setIsSaving(true);
    try {
      await onAddExpense(expense);
      setDescription('');
      setAmount('');
      setCategory('Other');
      setNotes('');
      setTax('');
      setAiSuggestion(null);
      clearScanContext();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save the expense.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800">Add New Expense</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <ReceiptScanPanel onScanComplete={applyScanResult} currency={currency} />

          {scanHints && (
            <div
              className={`flex gap-3 rounded-lg border p-4 text-sm ${
                scanHints.confidence === 'high'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-amber-200 bg-amber-50 text-amber-950'
              }`}
              role="status"
            >
              <Info className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <div className="space-y-2 min-w-0">
                <p className="font-semibold leading-snug">
                  {scanHints.confidence === 'high'
                    ? 'Fields filled from your image'
                    : 'Please verify these details'}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  On-device OCR can misread glare, fonts, or small text. Check the{' '}
                  <strong>amount</strong> and <strong>description</strong> match your receipt
                  and <strong>scanned item notes</strong> match your receipt before you save.
                </p>
                {scanHints.itemCount > 0 && (
                  <p className="text-slate-700 leading-relaxed">
                    Added {scanHints.itemCount} scanned item{scanHints.itemCount === 1 ? '' : 's'} to the optional notes field.
                  </p>
                )}
                {scanHints.warnings.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-slate-700">
                    {scanHints.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">Description</Label>
            <div className="relative">
              <Input
                id="description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="e.g., Coffee at Starbucks"
                className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
              {isAnalyzing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
            {aiSuggestion && (
              <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Sparkles className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-emerald-900">
                      AI suggests: <strong>{aiSuggestion.category}</strong>
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                      {Math.round(aiSuggestion.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">{aiSuggestion.reason}</p>
                  <p className="flex gap-1.5 text-xs leading-relaxed text-slate-700">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{aiSuggestion.action}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyAiSuggestion}
                  disabled={aiSuggestion.category === category}
                  className="ml-auto flex shrink-0 items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700 transition-colors disabled:cursor-default disabled:bg-emerald-200 disabled:text-emerald-700"
                >
                  <Check className="w-3 h-3" />
                  {aiSuggestion.category === category ? 'Applied' : 'Apply'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-slate-700">Amount ({currencySymbol})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  clearScanContext();
                  setAmount(e.target.value);
                }}
                placeholder="0.00"
                className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax" className="text-sm font-medium text-slate-700">Tax ({currencySymbol}) <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input
                id="tax"
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => {
                  clearScanContext();
                  setTax(e.target.value);
                }}
                placeholder="0.00"
                className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-slate-700">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    category === cat
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Team lunch, reimbursable, paid by card. Scanned receipts can add item names and prices here."
              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 caret-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              maxLength={700}
              rows={4}
            />
            <div className="text-right text-[11px] text-slate-400">{notes.length}/700</div>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Add Expense'}
          </Button>
          {submitError && (
            <p className="text-sm text-rose-600" role="alert">{submitError}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
