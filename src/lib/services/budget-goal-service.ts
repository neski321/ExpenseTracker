
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import type { Budget } from '@/lib/types';

// Firestore collection path for user-specific budget goals
const getBudgetGoalsCollectionRef = (userId: string) => collection(db, 'users', userId, 'budgetGoals');

// Type for data stored in Firestore (without calculated spentAmount or name)
type BudgetGoalDocumentData = Omit<Budget, 'id' | 'spentAmount' | 'name'>;

export async function addBudgetGoalDoc(
  userId: string,
  budgetGoalData: BudgetGoalDocumentData
): Promise<Omit<Budget, 'spentAmount' | 'name'>> { // Returns the goal as stored
  try {
    const docRef = await addDoc(getBudgetGoalsCollectionRef(userId), budgetGoalData);
    return { id: docRef.id, ...budgetGoalData };
  } catch (error) {
    console.error("Error adding budget goal document: ", error);
    throw error;
  }
}

export async function getBudgetGoalsCol(userId: string): Promise<BudgetGoalDocumentData[]> {
  try {
    // Budgets don't have a natural order field, so fetching as is.
    // Sorting can be done client-side if needed (e.g., by category name after joining with categories)
    const snapshot = await getDocs(getBudgetGoalsCollectionRef(userId));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetGoalDocumentData));
  } catch (error) {
    console.error("Error getting budget goals collection: ", error);
    throw error;
  }
}

export async function updateBudgetGoalDoc(
  userId: string,
  budgetGoalId: string,
  updates: Partial<BudgetGoalDocumentData>
): Promise<void> {
  try {
    const budgetGoalDocRef = doc(db, 'users', userId, 'budgetGoals', budgetGoalId);
    await updateDoc(budgetGoalDocRef, updates);
  } catch (error) {
    console.error("Error updating budget goal document: ", error);
    throw error;
  }
}

export async function deleteBudgetGoalDoc(userId: string, budgetGoalId: string): Promise<void> {
  try {
    const budgetGoalDocRef = doc(db, 'users', userId, 'budgetGoals', budgetGoalId);
    await deleteDoc(budgetGoalDocRef);
  } catch (error) {
    console.error("Error deleting budget goal document: ", error);
    throw error;
  }
}
