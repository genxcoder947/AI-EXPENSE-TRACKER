import { Expense } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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