
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  query,
  FieldValue, 
  deleteField 
} from 'firebase/firestore';
import type { Expense } from '@/lib/types';

const FORM_NO_PAYMENT_METHOD_VALUE = "__no_payment_method_selected__";

interface ExpenseDataForApp extends Omit<Expense, 'id'> {}


export async function addExpenseDoc(
  userId: string,
  expenseData: ExpenseDataForApp
): Promise<Expense> {
  try {
    const docData: any = {
      description: expenseData.description,
      amount: expenseData.amount,
      date: expenseData.date instanceof Date ? Timestamp.fromDate(expenseData.date) : expenseData.date,
      categoryId: expenseData.categoryId,
      currencyId: expenseData.currencyId,
      isSubscription: expenseData.isSubscription || false,
    };

    if (expenseData.paymentMethodId && expenseData.paymentMethodId !== FORM_NO_PAYMENT_METHOD_VALUE) {
      docData.paymentMethodId = expenseData.paymentMethodId;
    }
    
    if (docData.isSubscription && expenseData.nextDueDate instanceof Date) {
      docData.nextDueDate = Timestamp.fromDate(expenseData.nextDueDate);
    } else if (docData.isSubscription && !expenseData.nextDueDate) {
      // If it's a subscription but no nextDueDate is provided, we might choose to omit it or throw an error earlier.
      // For now, it will be omitted if not a valid Date.
    }


    const docRef = await addDoc(getExpensesCollectionRef(userId), docData);
    return {
      id: docRef.id,
      ...expenseData
    };
  } catch (error: any) {
    console.error("Firebase error adding expense:", error.code, error.message);
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied. You might need to sign in again.");
    } else if (error.code === 'unavailable') {
        throw new Error("Could not connect to the database. Please check your internet connection and try again.");
    }
    throw new Error("Could not add expense due to a server error. Please try again later.");
  }
}

export async function getExpensesCol(userId: string): Promise<Expense[]> {
  try {
    const expensesQuery = query(getExpensesCollectionRef(userId), orderBy("date", "desc"));
    const snapshot = await getDocs(expensesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data(); 
      return {
        id: doc.id,
        description: data.description,
        amount: data.amount,
        date: (data.date as Timestamp).toDate(),
        categoryId: data.categoryId,
        paymentMethodId: data.paymentMethodId,
        isSubscription: data.isSubscription,
        nextDueDate: data.nextDueDate ? (data.nextDueDate as Timestamp).toDate() : undefined,
        currencyId: data.currencyId,
      } as Expense;
    });
  } catch (error: any) {
    console.error("Firebase error getting expenses:", error.code, error.message);
    if (error.code === 'permission-denied') {
        throw new Error("Permission denied when fetching expenses. Please sign in.");
    }  else if (error.code === 'unavailable') {
        throw new Error("Could not connect to the database to fetch expenses. Please check your internet connection.");
    }
    throw new Error("Could not fetch expenses. Please try again later.");
  }
}

export async function updateExpenseDoc(
  userId: string,
  expenseId: string,
  updates: Partial<ExpenseDataForApp>
): Promise<void> {
  try {
    const expenseDocRef = doc(db, 'users', userId, 'expenses', expenseId);
    const dataToUpdate: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'date' && value instanceof Date) {
        dataToUpdate[key] = Timestamp.fromDate(value);
      } else if (key === 'nextDueDate') {
        if (value instanceof Date) {
          dataToUpdate[key] = Timestamp.fromDate(value);
        } else if (value === null || value === undefined) {
          dataToUpdate[key] = deleteField();
        }
      } else if (key === 'paymentMethodId') {
        if (value === undefined || value === null || value === FORM_NO_PAYMENT_METHOD_VALUE) {
           dataToUpdate[key] = deleteField();
        } else {
           dataToUpdate[key] = value;
        }
      } else if (value !== undefined) { 
        dataToUpdate[key] = value;
      }
    }
    if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(expenseDocRef, dataToUpdate);
    }
  } catch (error: any) {
    console.error("Firebase error updating expense:", error.code, error.message);
    if (error.code === 'permission-denied') {
        throw new Error("Permission denied. You might need to sign in again.");
    } else if (error.code === 'unavailable') {
        throw new Error("Could not connect to the database to update expense. Please check your internet connection.");
    }
    throw new Error("Could not update expense due to a server error. Please try again later.");
  }
}

export async function deleteExpenseDoc(userId: string, expenseId: string): Promise<void> {
  try {
    const expenseDocRef = doc(db, 'users', userId, 'expenses', expenseId);
    await deleteDoc(expenseDocRef);
  } catch (error: any) {
    console.error("Firebase error deleting expense:", error.code, error.message);
     if (error.code === 'permission-denied') {
        throw new Error("Permission denied. You might need to sign in again.");
    } else if (error.code === 'unavailable') {
        throw new Error("Could not connect to the database to delete expense. Please check your internet connection.");
    }
    throw new Error("Could not delete expense due to a server error. Please try again later.");
  }
}

const getExpensesCollectionRef = (userId: string) => collection(db, 'users', userId, 'expenses');
