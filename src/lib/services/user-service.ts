
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import {
  originalCategoriesData,
  originalPaymentMethodsData,
  originalIncomeSourcesData,
  originalCurrenciesData,
  originalExchangeRatesData,
  originalBudgetGoalsData,
  originalSavingGoalsData,
} from '@/lib/mock-data';
import { getIconName } from '@/lib/icon-utils';
import type { Category, PaymentMethod, IncomeSource, Currency, ExchangeRate, SavingGoal, Budget } from '@/lib/types';

// Function to seed default data for a new user
export async function seedDefaultUserData(userId: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Seed Categories
    const categoriesColRef = collection(db, 'users', userId, 'categories');
    originalCategoriesData.forEach((categorySeed) => {
      const { icon, id, ...dataForDoc } = categorySeed;
      const categoryDocumentData: Omit<Category, 'id'> = {
        ...dataForDoc,
        iconName: getIconName(icon),
      };
      batch.set(doc(categoriesColRef, id), categoryDocumentData);
    });

    // Seed Payment Methods
    const paymentMethodsColRef = collection(db, 'users', userId, 'paymentMethods');
    originalPaymentMethodsData.forEach((pmSeed) => {
      const { id, ...dataForDoc } = pmSeed;
      batch.set(doc(paymentMethodsColRef, id), dataForDoc);
    });

    // Seed Income Sources
    const incomeSourcesColRef = collection(db, 'users', userId, 'incomeSources');
    originalIncomeSourcesData.forEach((isSeed) => {
      const { icon, id, ...dataForDoc } = isSeed;
      const incomeSourceDocumentData: Omit<IncomeSource, 'id'> = {
        ...dataForDoc,
        iconName: getIconName(icon),
      };
      batch.set(doc(incomeSourcesColRef, id), incomeSourceDocumentData);
    });

    // Seed Currencies
    const currenciesColRef = collection(db, 'users', userId, 'currencies');
    originalCurrenciesData.forEach((currencySeed) => {
      const { id, ...dataForDoc } = currencySeed;
      batch.set(doc(currenciesColRef, id), dataForDoc);
    });

    // Seed Exchange Rates
    const exchangeRatesColRef = collection(db, 'users', userId, 'exchangeRates');
    originalExchangeRatesData.forEach((rate) => {
      // Use currencyId as document ID for exchange rates
      batch.set(doc(exchangeRatesColRef, rate.currencyId), { rateToBase: rate.rateToBase });
    });

    // Seed Budget Goals
    const budgetGoalsColRef = collection(db, 'users', userId, 'budgetGoals');
    originalBudgetGoalsData.forEach((budgetGoalSeed) => {
      const { id, ...dataForDoc } = budgetGoalSeed; 
      const budgetGoalDocumentData: Omit<Budget, 'id' | 'spentAmount' | 'name'> = {
        categoryId: dataForDoc.categoryId,
        goalAmount: dataForDoc.goalAmount,
      };
      batch.set(doc(budgetGoalsColRef, id), budgetGoalDocumentData);
    });

    // Seed Saving Goals
    const savingGoalsColRef = collection(db, 'users', userId, 'savingGoals');
    originalSavingGoalsData.forEach((savingGoalSeed) => {
      const { icon, id, targetDate, ...dataForDoc } = savingGoalSeed;
      const savingGoalDocumentData: Omit<SavingGoal, 'id'> = {
        ...dataForDoc,
        iconName: getIconName(icon),
        targetDate: targetDate instanceof Date ? Timestamp.fromDate(targetDate) : undefined,
      };
      batch.set(doc(savingGoalsColRef, id), savingGoalDocumentData);
    });
    
    // Expenses and Incomes collections are created when user adds first entry.

    await batch.commit();
    console.log(`Default data seeded for user ${userId}`);
  } catch (error) {
    console.error(`Error seeding default data for user ${userId}:`, error);
    // Do not re-throw here if we want signup to proceed even if seeding fails partially
    // Or, re-throw if seeding is critical for app function on first login.
  }
}
