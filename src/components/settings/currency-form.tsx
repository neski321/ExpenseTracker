
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

const currencyFormSchema = z.object({
  name: z.string().min(2, "Currency name must be at least 2 characters.").max(50),
  code: z.string().min(3, "Currency code must be 3 characters.").max(3, "Currency code must be 3 characters.").toUpperCase(),
  symbol: z.string().min(1, "Symbol is required.").max(5),
});

type CurrencyFormValues = Omit<Currency, "id">;

interface CurrencyFormProps {
  onSubmit: (data: CurrencyFormValues) => void;
  existingCurrency?: Currency; 
}

export function CurrencyForm({ onSubmit, existingCurrency }: CurrencyFormProps) {
  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: existingCurrency ? {
      name: existingCurrency.name,
      code: existingCurrency.code,
      symbol: existingCurrency.symbol,
    } : {
      name: "",
      code: "",
      symbol: "",
    },
  });

  function handleSubmit(data: CurrencyFormValues) {
    onSubmit(data);
    if (!existingCurrency) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., US Dollar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency Code (3 letters)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., USD" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency Symbol</FormLabel>
              <FormControl>
                <Input placeholder="e.g., $" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingCurrency ? "Update Currency" : "Add Currency"}
        </Button>
      </form>
    </Form>
  );
}
