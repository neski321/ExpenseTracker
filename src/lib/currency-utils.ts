
import type { Currency, ExchangeRate } from "@/lib/types";

// Assuming USD (cur1 from mock-data) is the base currency.
// This should ideally be configurable by the user in a real application.
export const BASE_CURRENCY_ID = "cur1"; 

export function getCurrency(currencyId: string, currencies: Currency[]): Currency | undefined {
  return currencies.find(c => c.id === currencyId);
}

export function getCurrencySymbol(currencyId: string, currencies: Currency[]): string {
  const currency = getCurrency(currencyId, currencies);
  return currency ? currency.symbol : '$'; // Default to '$' if not found
}

export function convertToBaseCurrency(
  amount: number,
  currencyId: string,
  exchangeRates: ExchangeRate[],
  // currencies: Currency[] // Not strictly needed if BASE_CURRENCY_ID is fixed and rateToBase is consistent
): number {
  if (currencyId === BASE_CURRENCY_ID) {
    return amount;
  }
  
  const exchangeRate = exchangeRates.find(er => er.currencyId === currencyId);
  
  if (!exchangeRate) {
    console.warn(`Exchange rate not found for currency ID: ${currencyId}. Returning original amount.`);
    // In a real app, you might want to throw an error or handle this more gracefully,
    // e.g., by prompting the user to set the rate or using a default/fallback.
    return amount; 
  }
  
  return amount * exchangeRate.rateToBase;
}
