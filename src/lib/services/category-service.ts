
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
  documentId
} from 'firebase/firestore';
import type { Category } from '@/lib/types';
import { getExpensesCol } from './expense-service'; // Import expense service
import { getBudgetGoalsCol } from './budget-goal-service'; // Import budget goal service

// Firestore collection path for user-specific categories
const getCategoriesCollectionRef = (userId: string) => collection(db, 'users', userId, 'categories');

export async function addCategoryDoc(
  userId: string,
  categoryData: Omit<Category, 'id'>
): Promise<Category> {
  try {
    const docRef = await addDoc(getCategoriesCollectionRef(userId), categoryData);
    return { id: docRef.id, ...categoryData };
  } catch (error) {
    console.error("Error adding category document: ", error);
    throw error;
  }
}

export async function getCategoriesCol(userId: string): Promise<Category[]> {
  try {
    const snapshot = await getDocs(getCategoriesCollectionRef(userId));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error("Error getting categories collection: ", error);
    throw error;
  }
}

export async function updateCategoryDoc(
  userId: string,
  categoryId: string,
  updates: Partial<Omit<Category, 'id'>>
): Promise<void> {
  try {
    const categoryDocRef = doc(db, 'users', userId, 'categories', categoryId);
    await updateDoc(categoryDocRef, updates);
  } catch (error) {
    console.error("Error updating category document: ", error);
    throw error;
  }
}

export async function deleteCategoryDoc(userId: string, categoryId: string): Promise<void> {
  try {
    // Check if this category is a parent to any other categories
    const subCategoriesQuery = query(getCategoriesCollectionRef(userId), where("parentId", "==", categoryId));
    const subCategoriesSnapshot = await getDocs(subCategoriesQuery);
    if (!subCategoriesSnapshot.empty) {
      throw new Error("Cannot delete category: It has sub-categories. Please delete or reassign them first.");
    }
    
    // Check if category is in use by expenses
    const userExpenses = await getExpensesCol(userId);
    const isUsedInExpenses = userExpenses.some(exp => exp.categoryId === categoryId);
    if (isUsedInExpenses) {
        throw new Error("Cannot delete category: It is currently used by one or more expenses. Please reassign those expenses first.");
    }

    // Check if category is in use by budgets
    const userBudgetGoals = await getBudgetGoalsCol(userId); // This fetches budget goals which store categoryId
    const isUsedInBudgets = userBudgetGoals.some(budget => budget.categoryId === categoryId);
    if (isUsedInBudgets) {
        throw new Error("Cannot delete category: It is currently used in one or more budget goals. Please remove or update those budgets first.");
    }

    const categoryDocRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(categoryDocRef);
  } catch (error)
  {
    console.error("Error deleting category document: ", error);
    throw error;
  }
}

