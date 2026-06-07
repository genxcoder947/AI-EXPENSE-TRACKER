import { Expense, Income } from '../types';

export interface ApiUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  user: ApiUser;
  token: string;
}

type ExpenseInput = Omit<Expense, 'id'>;
type IncomeInput = Omit<Income, 'id'>;

const TOKEN_KEY = 'expenseai_api_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function hasStoredSession(): boolean {
  return Boolean(getAuthToken());
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError('Cannot connect to the backend. Starting backend server...', 0);
  }

  const contentType = response.headers.get('Content-Type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed with status ${response.status}`, response.status);
  }

  return data as T;
}

export async function register(email: string, password: string): Promise<AuthSession> {
  // Clear any existing session before creating a new account
  clearStoredSession();
  
  const session = await request<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(session.token);
  return session;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(session.token);
  return session;
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  const data = await request<{ user: ApiUser }>('/auth/me');
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } finally {
    clearStoredSession();
  }
}

export interface ForgotPasswordResult {
  message: string;
  resetCode?: string;
  expiresInMinutes?: number;
  emailEnabled?: boolean;
  emailSent?: boolean;
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  return request<ForgotPasswordResult>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  setAuthToken(session.token);
  return session;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const data = await request<{ expenses: Expense[] }>('/expenses');
  return data.expenses;
}

export async function createExpense(expense: ExpenseInput): Promise<Expense> {
  const data = await request<{ expense: Expense }>('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
  return data.expense;
}

export async function updateExpense(expense: Expense): Promise<Expense> {
  const data = await request<{ expense: Expense }>(`/expenses/${encodeURIComponent(expense.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes,
      aiSuggested: expense.aiSuggested,
    }),
  });
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchIncome(): Promise<Income[]> {
  const data = await request<{ income: Income[] }>('/income');
  return data.income;
}

export async function createIncome(income: IncomeInput): Promise<Income> {
  const data = await request<{ income: Income }>('/income', {
    method: 'POST',
    body: JSON.stringify(income),
  });
  return data.income;
}

export async function updateIncome(income: Income): Promise<Income> {
  const data = await request<{ income: Income }>(`/income/${encodeURIComponent(income.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      description: income.description,
      amount: income.amount,
      category: income.category,
      date: income.date,
      notes: income.notes,
    }),
  });
  return data.income;
}

export async function deleteIncome(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/income/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
