
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon?: LucideIcon; 
  parentId?: string; // Added for sub-categories
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

// Defines the rate to convert 1 unit of the currency to the base currency.
// e.g., if base is USD and currency is EUR, and 1 EUR = 1.08 USD, then rateToBase for EUR is 1.08.
// For the base currency itself (e.g., USD), rateToBase would be 1.
export interface ExchangeRate {
  currencyId: string; // Corresponds to Currency.id
  rateToBase: number; 
}

export interface Expense {
  id: string;
  date: Date; // Date the expense was incurred/logged
  description: string;
  amount: number;
  categoryId: string;
  paymentMethodId?: string; 
  isSubscription?: boolean;
  nextDueDate?: Date; // For recurring subscriptions
  currencyId: string; // ID of the currency for this expense's amount
}

export interface Budget {
  id: string;
  categoryId: string;
  name?: string; // Optional: if category name is not directly available
  goalAmount: number; // Assumed to be in the base currency
  spentAmount: number; // Calculated from expenses, converted to base currency
}

export interface IncomeSource {
  id: string;
  name: string;
  icon?: LucideIcon;
}

export interface Income {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currencyId: string;
  incomeSourceId: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number; // in base currency
  currentAmount: number; // in base currency
  targetDate?: Date;
  icon?: LucideIcon; // e.g., for a car, house, vacation
  notes?: string;
}

// For parsed data from import utils before full processing
export type ParsedRow = Record<string, any>;

