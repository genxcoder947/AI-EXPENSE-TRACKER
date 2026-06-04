// Currency conversion service with real-time exchange rates

export interface ExchangeRates {
  [key: string]: number;
}

interface StoredRates {
  rates: ExchangeRates;
  timestamp: number;
}

const RATES_STORAGE_KEY = 'exchangeRates';
const RATES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Base currency (all rates are relative to this)
const BASE_CURRENCY = 'USD';

// Fallback rates (used when API fails or is unavailable)
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CNY: 7.24,
  AUD: 1.53,
  CAD: 1.36,
};

/**
 * Fetch exchange rates from a free API
 * Using exchangerate-api.com (free tier, no API key required for basic usage)
 */
async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const data = await response.json();
    
    if (data.rates) {
      return data.rates;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return fallback rates if API fails
    return FALLBACK_RATES;
  }
}

/**
 * Get stored rates from localStorage
 */
function getStoredRates(): StoredRates | null {
  try {
    const stored = localStorage.getItem(RATES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored rates:', error);
  }
  return null;
}

/**
 * Store rates in localStorage with timestamp
 */
function storeRates(rates: ExchangeRates): void {
  try {
    const stored: StoredRates = {
      rates,
      timestamp: Date.now(),
    };
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error('Error storing rates:', error);
  }
}

/**
 * Check if stored rates are stale (older than 24 hours)
 */
function areRatesStale(stored: StoredRates): boolean {
  const now = Date.now();
  return (now - stored.timestamp) > RATES_CACHE_DURATION;
}

/**
 * Get current exchange rates
 * Fetches from API if rates are stale or not available
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const stored = getStoredRates();
  
  // If no stored rates or rates are stale, fetch new ones
  if (!stored || areRatesStale(stored)) {
    const rates = await fetchExchangeRates();
    storeRates(rates);
    return rates;
  }
  
  return stored.rates;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  // Convert to base currency first, then to target currency
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  return convertCurrency(1, fromCurrency, toCurrency, rates);
}

/**
 * Force refresh exchange rates (call this when user manually wants to update)
 */
export async function refreshExchangeRates(): Promise<ExchangeRates> {
  const rates = await fetchExchangeRates();
  storeRates(rates);
  return rates;
}
