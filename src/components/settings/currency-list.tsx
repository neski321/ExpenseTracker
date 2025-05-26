
"use client";

import type { Currency, ExchangeRate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BASE_CURRENCY_ID } from "@/lib/currency-utils";

interface CurrencyListProps {
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  onEditCurrency: (currency: Currency) => void;
  onDeleteCurrency: (currencyId: string) => void;
  onEditRate: (currency: Currency) => void;
}

export function CurrencyList({ currencies, exchangeRates, onEditCurrency, onDeleteCurrency, onEditRate }: CurrencyListProps) {

  if (currencies.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No currencies found. Add one to get started!</p>;
  }

  const getExchangeRateDisplay = (currencyId: string): string => {
    if (currencyId === BASE_CURRENCY_ID) return "Base Currency (1.00)";
    const rate = exchangeRates.find(r => r.currencyId === currencyId);
    return rate ? `1 ${currencies.find(c=>c.id === currencyId)?.code} = ${rate.rateToBase.toFixed(4)} ${currencies.find(c=>c.id === BASE_CURRENCY_ID)?.code}` : "Rate not set";
  };

  return (
    <div className="space-y-3">
      {currencies.map((currency) => (
        <Card key={currency.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-semibold">{currency.symbol}</span>
                    <div>
                        <span className="font-medium text-lg">{currency.name} ({currency.code})</span>
                        {currency.id === BASE_CURRENCY_ID && <Badge variant="secondary" className="ml-2">Base</Badge>}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{getExchangeRateDisplay(currency.id)}</span>
            </div>
            <div className="space-x-1">
              <Button variant="ghost" size="icon" onClick={() => onEditCurrency(currency)} aria-label={`Edit currency ${currency.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              {currency.id !== BASE_CURRENCY_ID && (
                 <Button variant="ghost" size="icon" onClick={() => onEditRate(currency)} aria-label={`Edit exchange rate for ${currency.name}`}>
                    <Edit3 className="h-4 w-4" />
                 </Button>
              )}
              {currency.id !== BASE_CURRENCY_ID && currencies.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDeleteCurrency(currency.id)} 
                  aria-label={`Delete currency ${currency.name}`}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
