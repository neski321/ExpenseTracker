import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  iconName?: string; // Changed from icon?: LucideIcon
  parentId?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  // Future enhancements: type (Card, Bank, Cash), details (last 4 digits)
}

export interface Currency {
  id: string;
  code: string; // e.g., USD, EUR
  name: string; // e.g., US Dollar, Euro
  symbol: string; // e.g., $, €
}

export interface ExchangeRate {
  currencyId: string; // Corresponds to Currency.id
  rateToBase: number;
}

export interface Expense {
  id: string;
  date: Date;
  description: string;
  amount: number;
  categoryId: string;
  paymentMethodId?: string;
  isSubscription?: boolean;
  nextDueDate?: Date;
  currencyId: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  name?: string;
  goalAmount: number;
  spentAmount: number;
}

export interface IncomeSource {
  id: string;
  name: string;
}

export interface Income {
  id: string;
  date: Date;
  amount: number;
  currencyId: string;
  incomeSourceId: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  iconName?: string; // Changed from icon?: LucideIcon
  notes?: string;
}

export type ParsedRow = Record<string, any>;
