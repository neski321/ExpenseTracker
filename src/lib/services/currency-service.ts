
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  documentId,
  setDoc // For setting doc with specific ID
} from 'firebase/firestore';
import type { Currency, Expense, Income } from '@/lib/types';
import { getExpensesCol } from './expense-service';
import { getIncomesCol } from './income-service';
import { BASE_CURRENCY_ID } from '../currency-utils'; // Assuming BASE_CURRENCY_ID might be used for checks

// Firestore collection path for user-specific currencies
const getCurrenciesCollectionRef = (userId: string) => collection(db, 'users', userId, 'currencies');

export async function addCurrencyDoc(
  userId: string,
  currencyData: Currency // Pass full Currency object including potential ID from original data
): Promise<Currency> {
  try {
    // If currencyData includes an ID (e.g., from original seeding defaults), use it as document ID
    const docRef = currencyData.id ? doc(getCurrenciesCollectionRef(userId), currencyData.id) : doc(getCurrenciesCollectionRef(userId));
    const dataToSave: Omit<Currency, 'id'> = {
        code: currencyData.code,
        name: currencyData.name,
        symbol: currencyData.symbol
    };
    await setDoc(docRef, dataToSave);
    return { id: docRef.id, ...dataToSave };
  } catch (error) {
    console.error("Error adding currency document: ", error);
    throw error;
  }
}

export async function getCurrenciesCol(userId: string): Promise<Currency[]> {
  try {
    const snapshot = await getDocs(getCurrenciesCollectionRef(userId));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Currency)).sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting currencies collection: ", error);
    throw error;
  }
}

export async function updateCurrencyDoc(
  userId: string,
  currencyId: string,
  updates: Partial<Omit<Currency, 'id'>>
): Promise<void> {
  try {
    const currencyDocRef = doc(db, 'users', userId, 'currencies', currencyId);
    await updateDoc(currencyDocRef, updates);
  } catch (error) {
    console.error("Error updating currency document: ", error);
    throw error;
  }
}

export async function deleteCurrencyDoc(userId: string, currencyId: string): Promise<void> {
  try {
    if (currencyId === BASE_CURRENCY_ID) { // Check against the concept of a base currency ID
      throw new Error("Cannot delete the base currency.");
    }

    const userExpenses = await getExpensesCol(userId);
    const isUsedInExpenses = userExpenses.some(expense => expense.currencyId === currencyId);
    if (isUsedInExpenses) {
      throw new Error("Cannot delete currency: It is used in expenses. Please reassign those expenses first.");
    }

    const userIncomes = await getIncomesCol(userId);
    const isUsedInIncomes = userIncomes.some(income => income.currencyId === currencyId);
    if (isUsedInIncomes) {
      throw new Error("Cannot delete currency: It is used in income entries. Please reassign those entries first.");
    }
    // TODO: Check against saving goals if they become currency-specific

    const currencyDocRef = doc(db, 'users', userId, 'currencies', currencyId);
    await deleteDoc(currencyDocRef);
  } catch (error) {
    console.error("Error deleting currency document: ", error);
    throw error;
  }
}
