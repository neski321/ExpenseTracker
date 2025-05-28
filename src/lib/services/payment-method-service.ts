
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
  documentId
} from 'firebase/firestore';
import type { PaymentMethod, Expense } from '@/lib/types';
import { getExpensesCol } from './expense-service'; // To check for usage

// Firestore collection path for user-specific payment methods
const getPaymentMethodsCollectionRef = (userId: string) => collection(db, 'users', userId, 'paymentMethods');

export async function addPaymentMethodDoc(
  userId: string,
  paymentMethodData: Omit<PaymentMethod, 'id'>
): Promise<PaymentMethod> {
  try {
    const docRef = await addDoc(getPaymentMethodsCollectionRef(userId), paymentMethodData);
    return { id: docRef.id, ...paymentMethodData };
  } catch (error) {
    console.error("Error adding payment method document: ", error);
    throw error;
  }
}

export async function getPaymentMethodsCol(userId: string): Promise<PaymentMethod[]> {
  try {
    const snapshot = await getDocs(getPaymentMethodsCollectionRef(userId));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)).sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting payment methods collection: ", error);
    throw error;
  }
}

export async function updatePaymentMethodDoc(
  userId: string,
  paymentMethodId: string,
  updates: Partial<Omit<PaymentMethod, 'id'>>
): Promise<void> {
  try {
    const pmDocRef = doc(db, 'users', userId, 'paymentMethods', paymentMethodId);
    await updateDoc(pmDocRef, updates);
  } catch (error) {
    console.error("Error updating payment method document: ", error);
    throw error;
  }
}

export async function deletePaymentMethodDoc(userId: string, paymentMethodId: string): Promise<void> {
  try {
    // Check if this payment method is used in any expenses
    const userExpenses = await getExpensesCol(userId);
    const isUsed = userExpenses.some(expense => expense.paymentMethodId === paymentMethodId);

    if (isUsed) {
      throw new Error("Cannot delete payment method: It is currently used by one or more expenses. Please reassign those expenses first.");
    }

    const pmDocRef = doc(db, 'users', userId, 'paymentMethods', paymentMethodId);
    await deleteDoc(pmDocRef);
  } catch (error) {
    console.error("Error deleting payment method document: ", error);
    throw error;
  }
}
