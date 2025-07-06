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
import type { SavingGoal } from '@/lib/types';

// Firestore collection path for user-specific saving goals
const getSavingGoalsCollectionRef = (userId: string) => collection(db, 'users', userId, 'savingGoals');

// Interface for data going into Firestore (uses Timestamp)
interface SavingGoalDocumentData extends Omit<SavingGoal, 'id' | 'targetDate'> {
  targetDate?: Timestamp;
}

// Interface for data coming from the app (uses Date)
interface SavingGoalDataForApp extends Omit<SavingGoal, 'id'> {
  // Date objects are used in the app for targetDate
}

export async function addSavingGoalDoc(
  userId: string,
  savingGoalData: SavingGoalDataForApp
): Promise<SavingGoal> {
  try {
    const dataToSave: SavingGoalDocumentData = {
      ...savingGoalData,
      targetDate: savingGoalData.targetDate instanceof Date ? Timestamp.fromDate(savingGoalData.targetDate) : undefined,
    };
    const docRef = await addDoc(getSavingGoalsCollectionRef(userId), dataToSave);
    // Immediately update the document to include the id field
    await updateDoc(docRef, { id: docRef.id });
    return { id: docRef.id, ...savingGoalData }; // Return with app's Date object
  } catch (error) {
    console.error("Error adding saving goal document: ", error);
    throw error;
  }
}

export async function getSavingGoalsCol(userId: string): Promise<SavingGoal[]> {
  try {
    const savingGoalsQuery = query(getSavingGoalsCollectionRef(userId), orderBy("targetDate", "asc"), orderBy("name", "asc"));
    const snapshot = await getDocs(savingGoalsQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data() as SavingGoalDocumentData;
      return {
        id: doc.id,
        ...data,
        targetDate: data.targetDate ? data.targetDate.toDate() : undefined,
      } as SavingGoal;
    });
  } catch (error) {
    console.error("Error getting saving goals collection: ", error);
    throw error;
  }
}

export async function updateSavingGoalDoc(
  userId: string,
  savingGoalId: string,
  updates: Partial<SavingGoalDataForApp>
): Promise<void> {
  try {
    const savingGoalDocRef = doc(db, 'users', userId, 'savingGoals', savingGoalId);
    const dataToUpdate: Record<string, any> = { ...updates };
    if (updates.targetDate instanceof Date) {
      dataToUpdate.targetDate = Timestamp.fromDate(updates.targetDate);
    } else if (updates.targetDate === null || updates.targetDate === undefined) {
      // If targetDate is explicitly cleared, remove it from Firestore
      dataToUpdate.targetDate = deleteField(); 
    }
    await updateDoc(savingGoalDocRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating saving goal document: ", error);
    throw error;
  }
}
// Helper to import deleteField
import { deleteField } from 'firebase/firestore';


export async function deleteSavingGoalDoc(userId: string, savingGoalId: string): Promise<void> {
  try {
    const savingGoalDocRef = doc(db, 'users', userId, 'savingGoals', savingGoalId);
    await deleteDoc(savingGoalDocRef);
  } catch (error) {
    console.error("Error deleting saving goal document: ", error);
    throw error;
  }
}
