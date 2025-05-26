
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Currency } from "@/lib/types";
import { BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { initialCurrenciesData } from "@/lib/mock-data"; // To get base currency code

const exchangeRateFormSchema = z.object({
  rateToBase: z.coerce.number().positive("Exchange rate must be a positive number."),
});

type ExchangeRateFormValues = { rateToBase: number };

interface ExchangeRateFormProps {
  currency: Currency;
  currentRate?: number;
  onSubmit: (rate: number) => void;
}

export function ExchangeRateForm({ currency, currentRate, onSubmit }: ExchangeRateFormProps) {
  const baseCurrencyCode = initialCurrenciesData.find(c => c.id === BASE_CURRENCY_ID)?.code || "BASE";
  const form = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateFormSchema),
    defaultValues: {
      rateToBase: currentRate || 1.0,
    },
  });

  function handleSubmit(data: ExchangeRateFormValues) {
    onSubmit(data.rateToBase);
  }

  if (currency.id === BASE_CURRENCY_ID) {
    return <p className="text-muted-foreground p-4 text-center">Exchange rate for the base currency ({currency.code}) is always 1.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="rateToBase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exchange Rate (1 {currency.code} to {baseCurrencyCode})</FormLabel>
              <FormControl>
                <Input type="number" step="0.0001" placeholder="e.g., 1.08" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          Set Rate
        </Button>
      </form>
    </Form>
  );
}
