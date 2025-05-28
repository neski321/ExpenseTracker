
import type { Category, Expense, PaymentMethod, Currency, ExchangeRate, IncomeSource, Income, SavingGoal, Budget } from "@/lib/types";
import * as Icons from "lucide-react"; 
import { getIconName } from './icon-utils';

// --- Original Default Data ---
// These arrays are used for seeding default data for new users.

export const originalCategoriesData: (Omit<Category, "iconName"> & { icon?: Icons.LucideIcon })[] = [
  { id: "cat1", name: "Groceries", icon: Icons.ShoppingCart },
  { id: "cat2", name: "Utilities", icon: Icons.Lightbulb },
  { id: "cat3", name: "Entertainment", icon: Icons.Film },
  { id: "cat4", name: "Transport", icon: Icons.Car },
  { id: "cat5", name: "Healthcare", icon: Icons.BriefcaseMedical },
  { id: "cat6", name: "Dining Out", icon: Icons.Utensils },
  { id: "cat7", name: "Other", icon: Icons.Tag },
  { id: "subcat1-1", name: "Fruits & Vegetables", icon: Icons.Apple, parentId: "cat1" },
  { id: "subcat1-2", name: "Pantry Staples", icon: Icons.Archive, parentId: "cat1" },
  { id: "subcat1-3", name: "Dairy & Eggs", icon: Icons.Egg, parentId: "cat1" },
  { id: "subcat3-1", name: "Movies & Shows", icon: Icons.Ticket, parentId: "cat3" },
  { id: "subcat3-2", name: "Streaming Services", icon: Icons.Youtube, parentId: "cat3" },
  { id: "subcat3-3", name: "Games & Hobbies", icon: Icons.Gamepad2, parentId: "cat3" },
  { id: "subcat2-1", name: "Electricity", icon: Icons.Zap, parentId: "cat2" },
  { id: "subcat2-2", name: "Internet & Phone", icon: Icons.Wifi, parentId: "cat2" },
  { id: "subcat2-3", name: "Water & Gas", icon: Icons.Droplets, parentId: "cat2" },
];

export const originalPaymentMethodsData: PaymentMethod[] = [
  { id: "pm1", name: "Visa **** 1234" },
  { id: "pm2", name: "Mastercard **** 5678" },
  { id: "pm3", name: "Checking Account" },
  { id: "pm4", name: "Cash Wallet" },
  { id: "pm5", name: "PayPal" },
];

export const originalCurrenciesData: Currency[] = [
  { id: "cur1", code: "USD", name: "US Dollar", symbol: "$" },
  { id: "cur2", code: "EUR", name: "Euro", symbol: "€" },
  { id: "cur3", code: "GBP", name: "British Pound", symbol: "£" },
  { id: "cur4", code: "JPY", name: "Japanese Yen", symbol: "¥" },
];

export const originalExchangeRatesData: ExchangeRate[] = [
  { currencyId: "cur1", rateToBase: 1.00 }, // USD to USD
  { currencyId: "cur2", rateToBase: 1.08 }, // EUR to USD
  { currencyId: "cur3", rateToBase: 1.27 }, // GBP to USD
  { currencyId: "cur4", rateToBase: 0.0068 },// JPY to USD
];

export const originalIncomeSourcesData: (Omit<IncomeSource, "iconName"> & { icon?: Icons.LucideIcon })[] = [
  { id: "is1", name: "Salary", icon: Icons.Briefcase },
  { id: "is2", name: "Freelance Project", icon: Icons.Laptop },
  { id: "is3", name: "Investment Dividend", icon: Icons.TrendingUp },
  { id: "is4", name: "Gift", icon: Icons.Gift },
  { id: "is5", name: "Other Income", icon: Icons.DollarSign },
];

export const defaultExpensesData: Expense[] = [];
export const defaultIncomesData: Income[] = [];

export const originalSavingGoalsData: (Omit<SavingGoal, "iconName"> & { icon?: Icons.LucideIcon, targetDate?: Date })[] = [
  { id: "sg1", name: "New Laptop", targetAmount: 1500, currentAmount: 300, icon: Icons.Laptop, targetDate: new Date(2024, 11, 31), notes: "For work and personal projects." },
  { id: "sg2", name: "Summer Vacation '25", targetAmount: 2000, currentAmount: 1200, icon: Icons.Plane, targetDate: new Date(2025, 5, 1), notes: "Trip to Italy!" },
];
export const originalBudgetGoalsData: Omit<Budget, 'spentAmount' | 'name'>[] = [
  { id: "bud1", categoryId: "cat1", goalAmount: 300 },
  { id: "bud2", categoryId: "subcat2-1", goalAmount: 100 },
];


// --- Mutable Data Arrays (Live Data for non-Firestore entities or fallback during migration) ---
// These are now mostly DEPRECATED for logged-in users as data comes from Firestore.
// They are kept here minimally for any component that hasn't been fully migrated yet,
// or for the `resetAllDataToDefaults` function if it were to operate on local mock state.

export let initialCategoriesData: Category[] = originalCategoriesData.map(category => {
  const { icon, ...rest } = category;
  return { ...rest, iconName: getIconName(icon) };
});


// PaymentMethods, Currencies, ExchangeRates, IncomeSources, SavingGoals, BudgetGoals
// are now primarily managed by Firestore for logged-in users.
// These `initial...Data` arrays can be removed or kept empty if no components rely on them as a fallback.
// For safety during migration, keeping them empty or with minimal structure.
export let initialPaymentMethodsData: PaymentMethod[] = [];
export let initialCurrenciesData: Currency[] = [];
export let initialExchangeRatesData: ExchangeRate[] = [];
export let initialIncomeSourcesData: IncomeSource[] = [];
export let initialSavingGoalsData: SavingGoal[] = [];
export let initialBudgetGoalsData: Omit<Budget, 'spentAmount'>[] = [];


// Expenses and Incomes are also primarily from Firestore for logged-in users.
export let initialExpensesData: Expense[] = [];
export let initialIncomesData: Income[] = [];


// --- Functions to Reset Data to Defaults (primarily for local mock data if needed) ---
// Note: With Firestore, "resetting" user data means deleting their collections and re-seeding.
// This function's primary use was for the old mock data system.
export function resetAllDataToDefaults() {
  // This function would re-initialize the `initial...Data` arrays from `original...Data`
  // For Firestore, actual data deletion and re-seeding is handled differently (server-side or via services).
  console.warn("resetAllDataToDefaults is for mock data and should be re-evaluated for Firestore context.");

  // Example of how it would work for mock data (currently most data is Firestore backed for users)
  initialCategoriesData = originalCategoriesData.map(category => {
    const { icon, ...rest } = category;
    return { ...rest, iconName: getIconName(icon) };
  });
  // ... and so on for other initial...Data arrays if they were still primary.
  initialExpensesData = [];
  initialIncomesData = [];
  initialBudgetGoalsData = [];
  initialSavingGoalsData = [];
  // etc.
}

// These functions for adding imported items to global mock arrays are also less relevant
// now that imports directly add to Firestore.
export function addImportedExpenses(importedItems: Expense[]) {
  if (!importedItems || importedItems.length === 0) return;
  // initialExpensesData.push(...importedItems); // No longer directly mutating global mock
  // initialExpensesData = [...initialExpensesData]; // No longer directly mutating global mock
  console.warn("addImportedExpenses to global mock is deprecated; use Firestore service.");
}

export function addImportedIncomes(importedItems: Income[]) {
  if (!importedItems || importedItems.length === 0) return;
  // initialIncomesData.push(...importedItems); // No longer directly mutating global mock
  // initialIncomesData = [...initialIncomesData]; // No longer directly mutating global mock
  console.warn("addImportedIncomes to global mock is deprecated; use Firestore service.");
}
