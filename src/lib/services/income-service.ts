
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
  query
} from 'firebase/firestore';
import type { Income } from '@/lib/types';

// Firestore collection path for user-specific income
const getIncomesCollectionRef = (userId: string) => collection(db, 'users', userId, 'incomes');

interface IncomeDocumentData extends Omit<Income, 'id' | 'date'> {
  date: Timestamp;
}

interface IncomeDataForFirestore extends Omit<Income, 'id' | 'date'> {
  date: Date | Timestamp;
}

export async function addIncomeDoc(
  userId: string,
  incomeData: Omit<Income, 'id'>
): Promise<Income> {
  try {
    const dataToSave: IncomeDataForFirestore = {
      ...incomeData,
      date: incomeData.date instanceof Date ? Timestamp.fromDate(incomeData.date) : incomeData.date,
    };
    const docRef = await addDoc(getIncomesCollectionRef(userId), dataToSave);
    return { 
      id: docRef.id, 
      ...incomeData 
    };
  } catch (error) {
    console.error("Error adding income document: ", error);
    throw error;
  }
}

export async function getIncomesCol(userId: string): Promise<Income[]> {
  try {
    const incomesQuery = query(getIncomesCollectionRef(userId), orderBy("date", "desc"));
    const snapshot = await getDocs(incomesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data() as IncomeDocumentData;
      return {
        id: doc.id,
        ...data,
        date: data.date.toDate(),
      } as Income;
    });
  } catch (error) {
    console.error("Error getting incomes collection: ", error);
    throw error;
  }
}

export async function updateIncomeDoc(
  userId: string,
  incomeId: string,
  updates: Partial<Omit<Income, 'id'>>
): Promise<void> {
  try {
    const incomeDocRef = doc(db, 'users', userId, 'incomes', incomeId);
    const dataToUpdate: Partial<IncomeDataForFirestore> = { ...updates };
    if (updates.date) {
      dataToUpdate.date = updates.date instanceof Date ? Timestamp.fromDate(updates.date) : updates.date;
    }
    await updateDoc(incomeDocRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating income document: ", error);
    throw error;
  }
}

export async function deleteIncomeDoc(userId: string, incomeId: string): Promise<void> {
  try {
    const incomeDocRef = doc(db, 'users', userId, 'incomes', incomeId);
    await deleteDoc(incomeDocRef);
  } catch (error) {
    console.error("Error deleting income document: ", error);
    throw error;
  }
}
