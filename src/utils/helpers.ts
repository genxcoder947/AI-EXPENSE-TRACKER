import { Expense } from '../types';
import { convertCurrency, getExchangeRates as fetchExchangeRates, refreshExchangeRates, getExchangeRate as fetchExchangeRate, ExchangeRates } from './currencyConverter';

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
let cachedRates: ExchangeRates | null = null;
let ratesPromise: Promise<ExchangeRates> | null = null;

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

export const formatCurrency = (amount: number, currency: string = preferredCurrency, originalCurrency?: string): string => {
  // If original currency is provided and different from display currency, convert
  if (originalCurrency && originalCurrency !== currency) {
    // This is a synchronous version for backward compatibility
    // For async conversion, use formatCurrencyWithConversion
    return new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  }
  
  return new Intl.NumberFormat(currencyLocales[currency] || 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
};

async function ensureRates(): Promise<ExchangeRates> {
  if (cachedRates) {
    return cachedRates;
  }
  
  if (!ratesPromise) {
    ratesPromise = fetchExchangeRates().then(rates => {
      cachedRates = rates;
      ratesPromise = null;
      return rates;
    });
  }
  
  return ratesPromise;
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  return ensureRates();
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  const rates = await ensureRates();
  return fetchExchangeRate(fromCurrency, toCurrency, rates);
}

export async function formatCurrencyWithConversion(
  amount: number,
  fromCurrency: string = preferredCurrency,
  toCurrency: string = preferredCurrency
): Promise<string> {
  if (fromCurrency === toCurrency) {
    return formatCurrency(amount, toCurrency);
  }

  const rates = await ensureRates();
  const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency, rates);
  return formatCurrency(convertedAmount, toCurrency);
}

export async function convertAmount(
  amount: number,
  fromCurrency: string = preferredCurrency,
  toCurrency: string = preferredCurrency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await ensureRates();
  return convertCurrency(amount, fromCurrency, toCurrency, rates);
}

export async function refreshCurrencyRates(): Promise<void> {
  cachedRates = await refreshExchangeRates();
}

export const parseDateOnly = (dateString: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(`${dateString}T00:00:00`);
  }

  return new Date(dateString);
};

export const formatDate = (dateString: string): string => {
  const date = parseDateOnly(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (date: Date | string): string => {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const sortExpensesByDate = (expenses: Expense[]): Expense[] => {
  return [...expenses].sort((a, b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime());
};
