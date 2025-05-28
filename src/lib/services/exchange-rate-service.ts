
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc // Added deleteDoc
} from 'firebase/firestore';
import type { ExchangeRate } from '@/lib/types';

// Firestore collection path for user-specific exchange rates
// Rates are stored with document ID being the currencyId
const getExchangeRatesCollectionRef = (userId: string) => collection(db, 'users', userId, 'exchangeRates');

export async function setExchangeRateDoc(
  userId: string,
  currencyId: string, // This will be the document ID
  rateToBase: number
): Promise<void> {
  try {
    const rateDocRef = doc(getExchangeRatesCollectionRef(userId), currencyId);
    await setDoc(rateDocRef, { currencyId, rateToBase }); // Store currencyId inside as well for easier querying if needed
  } catch (error) {
    console.error("Error setting exchange rate document: ", error);
    throw error;
  }
}

export async function getExchangeRatesCol(userId: string): Promise<ExchangeRate[]> {
  try {
    const snapshot = await getDocs(getExchangeRatesCollectionRef(userId));
    return snapshot.docs.map(doc => ({
      // The document ID is the currencyId
      currencyId: doc.id, 
      ...doc.data() 
    } as ExchangeRate));
  } catch (error) {
    console.error("Error getting exchange rates collection: ", error);
    throw error;
  }
}

export async function deleteExchangeRateDoc(userId: string, currencyId: string): Promise<void> {
  try {
    const rateDocRef = doc(getExchangeRatesCollectionRef(userId), currencyId);
    await deleteDoc(rateDocRef);
    console.log(`Exchange rate for currencyId ${currencyId} deleted for user ${userId}`);
  } catch (error) {
    // It's okay if the document doesn't exist, so we don't strictly need to re-throw unless it's a different error
    if ((error as any).code !== 'not-found') {
        console.error("Error deleting exchange rate document: ", error);
        // Optionally re-throw if you want to surface other errors
        // throw error; 
    } else {
        console.log(`No exchange rate found for currencyId ${currencyId} to delete for user ${userId}.`);
    }
  }
}
