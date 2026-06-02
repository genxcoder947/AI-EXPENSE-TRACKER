import { Expense } from '../types';

const DEFAULT_CURRENCY = 'INR';

const currencyLocales: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

let preferredCurrency = localStorage.getItem('currency') || DEFAULT_CURRENCY;

export const getPreferredCurrency = (): string => preferredCurrency;

export const setPreferredCurrency = (currency: string): void => {
  preferredCurrency = currency;
  localStorage.setItem('currency', currency);
};

export const getCurrencySymbol = (currency: string = preferredCurrency): string => {
  const parts = new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value || currency;
};

export const formatCurrency = (amount: number, currency: string = preferredCurrency): string => {
  return new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const sortExpensesByDate = (expenses: Expense[]): Expense[] => {
  return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
