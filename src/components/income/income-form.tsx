
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IncomeSource, Income, Currency } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { BASE_CURRENCY_ID } from "@/lib/currency-utils";

const incomeFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date(),
  incomeSourceId: z.string().min(1, "Please select an income source."),
  currencyId: z.string().min(1, "Please select a currency."),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  incomeSources: IncomeSource[];
  currencies: Currency[];
  onSubmit: (data: IncomeFormValues) => void;
  initialData?: Income;
}

export function IncomeForm({ incomeSources, currencies, onSubmit, initialData }: IncomeFormProps) {
  const { toast } = useToast();
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      amount: initialData.amount,
      currencyId: initialData.currencyId || BASE_CURRENCY_ID,
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      incomeSourceId: "",
      currencyId: BASE_CURRENCY_ID,
    },
  });

  function handleSubmit(data: IncomeFormValues) {
    onSubmit(data);
    const selectedCurrency = currencies.find(c => c.id === data.currencyId);
    toast({
      title: initialData ? "Income Updated!" : "Income Added!",
      description: `${data.description} for ${selectedCurrency?.symbol || ''}${data.amount.toFixed(2)}.`,
    });
    if (!initialData) {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        incomeSourceId: "",
        currencyId: BASE_CURRENCY_ID,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Salary, Project Payment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                        {currencies.find(c => c.id === form.watch("currencyId"))?.symbol || '$'}
                    </span>
                    <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currencyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Income</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
            control={form.control}
            name="incomeSourceId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Income Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an income source" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {incomeSources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                        {source.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {initialData ? "Update Income" : "Add Income"}
        </Button>
      </form>
    </Form>
  );
}
