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
import type { IncomeSource, Income } from '@/lib/types';
import { getIncomesCol } from './income-service'; // To check for usage

// Firestore collection path for user-specific income sources
const getIncomeSourcesCollectionRef = (userId: string) => collection(db, 'users', userId, 'incomeSources');

export async function addIncomeSourceDoc(
  userId: string,
  data: Omit<IncomeSource, 'id'>
): Promise<IncomeSource> {
  try {
    // Remove iconName if present and undefined
    const cleanData = { ...data };
    if ('iconName' in cleanData && cleanData.iconName === undefined) {
      delete (cleanData as any).iconName;
    }
    const docRef = await addDoc(getIncomeSourcesCollectionRef(userId), cleanData);
    await updateDoc(docRef, { id: docRef.id });
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error("Error adding income source document: ", error);
    throw error;
  }
}

export async function getIncomeSourcesCol(userId: string): Promise<IncomeSource[]> {
  try {
    const snapshot = await getDocs(getIncomeSourcesCollectionRef(userId));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncomeSource)).sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error getting income sources collection: ", error);
    throw error;
  }
}

export async function updateIncomeSourceDoc(
  userId: string,
  id: string,
  updates: Partial<Omit<IncomeSource, 'id'>>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'incomeSources', id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating income source document: ", error);
    throw error;
  }
}

export async function deleteIncomeSourceDoc(userId: string, id: string): Promise<void> {
  try {
    const userIncomes = await getIncomesCol(userId);
    const isUsed = userIncomes.some(income => income.incomeSourceId === id);

    if (isUsed) {
      throw new Error("Cannot delete income source: It is currently used by one or more income entries. Please reassign those entries first.");
    }

    const docRef = doc(db, 'users', userId, 'incomeSources', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting income source document: ", error);
    throw error;
  }
}
