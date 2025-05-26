
import type { Category, Expense, PaymentMethod, Currency, ExchangeRate, IncomeSource, Income, SavingGoal, Budget } from "@/lib/types";
import * as Icons from "lucide-react"; // Using the alias for convenience

// --- Original Default Data ---
const originalCategoriesData: Category[] = [
  // Top-level categories
  { id: "cat1", name: "Groceries", icon: Icons.ShoppingCart },
  { id: "cat2", name: "Utilities", icon: Icons.Lightbulb },
  { id: "cat3", name: "Entertainment", icon: Icons.Film },
  { id: "cat4", name: "Transport", icon: Icons.Car },
  { id: "cat5", name: "Healthcare", icon: Icons.BriefcaseMedical },
  { id: "cat6", name: "Dining Out", icon: Icons.Utensils },
  { id: "cat7", name: "Other", icon: Icons.Tag },

  // Sub-categories for Groceries (cat1)
  { id: "subcat1-1", name: "Fruits & Vegetables", icon: Icons.Apple, parentId: "cat1" },
  { id: "subcat1-2", name: "Pantry Staples", icon: Icons.Archive, parentId: "cat1" },
  { id: "subcat1-3", name: "Dairy & Eggs", icon: Icons.Egg, parentId: "cat1" },

  // Sub-categories for Entertainment (cat3)
  { id: "subcat3-1", name: "Movies & Shows", icon: Icons.Ticket, parentId: "cat3" },
  { id: "subcat3-2", name: "Streaming Services", icon: Icons.Youtube, parentId: "cat3" },
  { id: "subcat3-3", name: "Games & Hobbies", icon: Icons.Gamepad2, parentId: "cat3" },
  
  // Sub-categories for Utilities (cat2)
  { id: "subcat2-1", name: "Electricity", icon: Icons.Zap, parentId: "cat2" },
  { id: "subcat2-2", name: "Internet & Phone", icon: Icons.Wifi, parentId: "cat2" },
  { id: "subcat2-3", name: "Water & Gas", icon: Icons.Droplets, parentId: "cat2" },
];

const originalPaymentMethodsData: PaymentMethod[] = [
  { id: "pm1", name: "Visa **** 1234" },
  { id: "pm2", name: "Mastercard **** 5678" },
  { id: "pm3", name: "Checking Account" },
  { id: "pm4", name: "Cash Wallet" },
  { id: "pm5", name: "PayPal" },
];

const originalCurrenciesData: Currency[] = [
  { id: "cur1", code: "USD", name: "US Dollar", symbol: "$" },
  { id: "cur2", code: "EUR", name: "Euro", symbol: "€" },
  { id: "cur3", code: "GBP", name: "British Pound", symbol: "£" },
  { id: "cur4", code: "JPY", name: "Japanese Yen", symbol: "¥" },
];

const originalExchangeRatesData: ExchangeRate[] = [
  { currencyId: "cur1", rateToBase: 1.00 },    // USD to USD
  { currencyId: "cur2", rateToBase: 1.08 },    // EUR to USD
  { currencyId: "cur3", rateToBase: 1.27 },    // GBP to USD
  { currencyId: "cur4", rateToBase: 0.0068 },  // JPY to USD (example)
];

const originalIncomeSourcesData: IncomeSource[] = [
  { id: "is1", name: "Salary", icon: Icons.Briefcase },
  { id: "is2", name: "Freelance Project", icon: Icons.Laptop },
  { id: "is3", name: "Investment Dividend", icon: Icons.TrendingUp },
  { id: "is4", name: "Gift", icon: Icons.Gift },
  { id: "is5", name: "Other Income", icon: Icons.DollarSign },
];

// Default sample data for when the app starts or when non-transactional data is reset.
// These are NOT cleared when "Clear All Data" is pressed, but reset to these initial examples.
const originalSavingGoalsData: SavingGoal[] = [
  { id: "sg1", name: "New Laptop", targetAmount: 1500, currentAmount: 300, icon: Icons.Laptop, targetDate: new Date(2024, 11, 31), notes: "For work and personal projects." },
  { id: "sg2", name: "Summer Vacation '25", targetAmount: 2000, currentAmount: 1200, icon: Icons.Plane, targetDate: new Date(2025, 5, 1), notes: "Trip to Italy!" },
  { id: "sg3", name: "Emergency Fund", targetAmount: 5000, currentAmount: 4500, icon: Icons.ShieldCheck, notes: "Cover 3-6 months of expenses." },
  { id: "sg4", name: "Down Payment (Future)", targetAmount: 25000, currentAmount: 1500, icon: Icons.Home, notes: "Saving for a house down payment." },
];

const originalBudgetGoalsData: Omit<Budget, 'spentAmount'>[] = [
  { id: "bud1", categoryId: "cat1", goalAmount: 300 },       // Groceries (Parent)
  { id: "bud2", categoryId: "subcat2-1", goalAmount: 100 },  // Electricity (Sub)
  { id: "bud3", categoryId: "subcat3-2", goalAmount: 50 },  // Streaming Services (Sub)
  { id: "bud4", categoryId: "cat6", goalAmount: 150 },       // Dining Out (Parent)
];

// --- Default Transactional Data (starts empty for new deployments or after clearing) ---
const defaultExpensesData: Expense[] = [];
const defaultIncomesData: Income[] = [];


// --- Mutable Data Arrays (Live Data) ---
// These are initialized from originals or defaults
export let initialCategoriesData: Category[] = originalCategoriesData.map(category => ({ ...category }));
export let initialPaymentMethodsData: PaymentMethod[] = JSON.parse(JSON.stringify(originalPaymentMethodsData));
export let initialCurrenciesData: Currency[] = JSON.parse(JSON.stringify(originalCurrenciesData));
export let initialExchangeRatesData: ExchangeRate[] = JSON.parse(JSON.stringify(originalExchangeRatesData));
export let initialIncomeSourcesData: IncomeSource[] = originalIncomeSourcesData.map(source => ({ ...source }));

// Initialized with samples, but cleared by reset function
export let initialSavingGoalsData: SavingGoal[] = originalSavingGoalsData.map(goal => {
  const copiedGoal = { ...goal };
  if (goal.targetDate) {
    copiedGoal.targetDate = new Date(goal.targetDate.getTime());
  }
  return copiedGoal;
});
// Initialized with samples, but cleared by reset function
export let initialBudgetGoalsData: Omit<Budget, 'spentAmount'>[] = JSON.parse(JSON.stringify(originalBudgetGoalsData));

export let initialExpensesData: Expense[] = JSON.parse(JSON.stringify(defaultExpensesData)).map((exp: any) => ({
    ...exp,
    date: new Date(exp.date), 
    nextDueDate: exp.nextDueDate ? new Date(exp.nextDueDate) : undefined,
}));

export let initialIncomesData: Income[] = JSON.parse(JSON.stringify(defaultIncomesData)).map((inc: any) => ({
    ...inc,
    date: new Date(inc.date), 
}));


// --- Functions to Reset Data to Defaults ---
export function resetCategoriesToDefault() {
  initialCategoriesData = originalCategoriesData.map(category => ({ ...category }));
}
export function resetPaymentMethodsToDefault() {
  initialPaymentMethodsData = JSON.parse(JSON.stringify(originalPaymentMethodsData));
}
export function resetCurrenciesToDefault() {
  initialCurrenciesData = JSON.parse(JSON.stringify(originalCurrenciesData));
}
export function resetExchangeRatesToDefault() {
  initialExchangeRatesData = JSON.parse(JSON.stringify(originalExchangeRatesData));
}
export function resetIncomeSourcesToDefault() {
  initialIncomeSourcesData = originalIncomeSourcesData.map(source => ({ ...source }));
}
export function resetSavingGoalsToDefault() {
  // Clear saving goals, not reset to original samples
  initialSavingGoalsData = []; 
}
export function resetBudgetGoalsToDefault() {
  // Clear budget goals, not reset to original samples
  initialBudgetGoalsData = []; 
}
export function resetExpensesToDefault() { 
  initialExpensesData = JSON.parse(JSON.stringify(defaultExpensesData)).map((exp: any) => ({
    ...exp,
    date: new Date(exp.date),
    nextDueDate: exp.nextDueDate ? new Date(exp.nextDueDate) : undefined,
  }));
}
export function resetIncomesToDefault() { 
  initialIncomesData = JSON.parse(JSON.stringify(defaultIncomesData)).map((inc: any) => ({
    ...inc,
    date: new Date(inc.date),
  }));
}

export function resetAllDataToDefaults() {
  resetCategoriesToDefault();
  resetPaymentMethodsToDefault();
  resetCurrenciesToDefault();
  resetExchangeRatesToDefault();
  resetIncomeSourcesToDefault();
  
  resetSavingGoalsToDefault(); // Now clears saving goals
  resetBudgetGoalsToDefault(); // Now clears budget goals
  
  resetExpensesToDefault(); 
  resetIncomesToDefault();  
}

// --- Functions to add imported data and trigger reference changes ---
export function addImportedExpenses(importedItems: Expense[]) {
  if (!importedItems || importedItems.length === 0) return;
  initialExpensesData.push(...importedItems);
  initialExpensesData = [...initialExpensesData]; // Create new reference
}

export function addImportedIncomes(importedItems: Income[]) {
  if (!importedItems || importedItems.length === 0) return;
  initialIncomesData.push(...importedItems);
  initialIncomesData = [...initialIncomesData]; // Create new reference
}

// --- Legacy Modifiable Data (kept for compatibility if any direct modification was happening, though reset functions are preferred) ---
export let initialCategoriesData_MODIFIABLE = initialCategoriesData;
export let initialPaymentMethodsData_MODIFIABLE = initialPaymentMethodsData;
export let initialCurrenciesData_MODIFIABLE = initialCurrenciesData;
export let initialExchangeRatesData_MODIFIABLE = initialExchangeRatesData;
