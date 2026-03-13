// Frontend types for FinTrack

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: 'ADMIN' | 'MEMBER';
  user: { id: string; name: string; email: string };
}

export type TransactionType = 'FIXED' | 'VARIABLE' | 'INSTALLMENT' | 'INCOME';
export type Ownership = 'MINE' | 'HERS' | 'SHARED';

export interface Category {
  id: string;
  groupId: string;
  name: string;
  color: string | null;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  groupId: string;
  name: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  groupId: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  ownership: Ownership;
  isPaid: boolean;
  notes: string | null;
  installmentCount: number | null;
  category?: Category;
  paymentMethod?: PaymentMethod;
}

export interface Installment {
  id: string;
  transactionId: string;
  number: number;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export interface Budget {
  id: string;
  groupId: string;
  categoryId: string;
  month: number;
  year: number;
  limitAmount: number;
  category?: Category;
}

// Dashboard types
export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategoryExpense {
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  total: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface OwnershipBreakdown {
  ownership: Ownership;
  total: number;
  count: number;
}

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  spent: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
