
"use client";

import type { Currency, ExchangeRate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CurrencyListProps {
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  onEditCurrency: (currency: Currency) => void;
  onDeleteCurrency: (currencyId: string) => void;
  onEditRate: (currency: Currency) => void;
  baseCurrencyId: string;
  baseCurrencySymbol: string; // Added this prop
}

export function CurrencyList({ 
  currencies, 
  exchangeRates, 
  onEditCurrency, 
  onDeleteCurrency, 
  onEditRate, 
  baseCurrencyId,
  baseCurrencySymbol // Destructure new prop
}: CurrencyListProps) {

  if (currencies.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No currencies found. Add one to get started!</p>;
  }

  const getExchangeRateDisplay = (currency: Currency): string => {
    if (currency.id === baseCurrencyId) return `Base Currency (1.00 ${baseCurrencySymbol})`;
    const rate = exchangeRates.find(r => r.currencyId === currency.id);
    return rate ? `1 ${currency.code} = ${rate.rateToBase.toFixed(4)} ${baseCurrencySymbol}` : "Rate not set";
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
                        {currency.id === baseCurrencyId && <Badge variant="secondary" className="ml-2">Base</Badge>}
                    </div>
                </div>
                <span className="text-xs text-muted-foreground mt-1">{getExchangeRateDisplay(currency)}</span>
            </div>
            <div className="space-x-1">
              <Button variant="ghost" size="icon" onClick={() => onEditCurrency(currency)} aria-label={`Edit currency ${currency.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              {currency.id !== baseCurrencyId && (
                 <Button variant="ghost" size="icon" onClick={() => onEditRate(currency)} aria-label={`Edit exchange rate for ${currency.name}`}>
                    <Edit3 className="h-4 w-4" />
                 </Button>
              )}
              {currency.id !== baseCurrencyId && currencies.length > 1 && (
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
