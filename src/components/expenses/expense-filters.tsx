
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
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
import { CalendarIcon, DollarSign, FilterX, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, PaymentMethod } from "@/lib/types";
import type { DateRange } from "react-day-picker";
import React, { useState, useEffect, useMemo } from "react";
import { getMainCategories, getSubCategories } from "@/lib/category-utils";

export interface ExpenseFilterValues {
  dateRange?: DateRange;
  mainCategoryId?: string;
  subCategoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethodId?: string;
}

const filterSchema = z.object({
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  mainCategoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  paymentMethodId: z.string().optional(),
}).refine(data => {
    if (data.minAmount !== undefined && data.maxAmount !== undefined && data.minAmount > data.maxAmount) {
        return false;
    }
    return true;
}, {
    message: "Min amount cannot be greater than max amount",
    path: ["minAmount"],
});

interface ExpenseFiltersProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onApplyFilters: (filters: ExpenseFilterValues) => void;
  initialFilters?: ExpenseFilterValues;
}

export function ExpenseFilters({ categories, paymentMethods, onApplyFilters, initialFilters }: ExpenseFiltersProps) {
  const form = useForm<ExpenseFilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: initialFilters || {
      dateRange: undefined,
      mainCategoryId: "",
      subCategoryId: "",
      minAmount: undefined,
      maxAmount: undefined,
      paymentMethodId: "",
    },
  });

  const [availableSubCategories, setAvailableSubCategories] = useState<Category[]>([]);
  const mainCategoryWatch = form.watch("mainCategoryId");

  const mainCategoriesForSelect = useMemo(() => getMainCategories(categories), [categories]);

  useEffect(() => {
    if (mainCategoryWatch) {
      setAvailableSubCategories(getSubCategories(mainCategoryWatch, categories));
    } else {
      setAvailableSubCategories([]);
    }
    // Reset subCategoryId when mainCategoryId changes or is cleared
    if (form.getValues("subCategoryId")) {
       form.setValue("subCategoryId", "", { shouldValidate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainCategoryWatch, categories]);


  const onSubmit = (data: ExpenseFilterValues) => {
    const processedData = {
        ...data,
        minAmount: data.minAmount === undefined || isNaN(data.minAmount) ? undefined : Number(data.minAmount),
        maxAmount: data.maxAmount === undefined || isNaN(data.maxAmount) ? undefined : Number(data.maxAmount),
        mainCategoryId: data.mainCategoryId === "" ? undefined : data.mainCategoryId,
        subCategoryId: data.subCategoryId === "" ? undefined : data.subCategoryId,
        paymentMethodId: data.paymentMethodId === "" ? undefined : data.paymentMethodId,
    };
    onApplyFilters(processedData);
  };

  const handleClearFilters = () => {
    form.reset({
      dateRange: undefined,
      mainCategoryId: "",
      subCategoryId: "",
      minAmount: undefined,
      maxAmount: undefined,
      paymentMethodId: "",
    });
    setAvailableSubCategories([]);
    onApplyFilters({}); 
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Range</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, "LLL dd, y")} - {" "}
                              {format(field.value.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(field.value.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={field.value?.from}
                      selected={field.value}
                      onSelect={field.onChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mainCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Main Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All Main Categories" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mainCategoriesForSelect.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
                  disabled={!mainCategoryWatch || availableSubCategories.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={!mainCategoryWatch ? "Select a main category first" : "All Sub-Categories"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSubCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <FormField
            control={form.control}
            name="paymentMethodId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All Payment Methods" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" placeholder="0.00" className="pl-8" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" placeholder="e.g., 100.00" className="pl-8" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
          <Button type="button" variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto shadow-sm">
            <FilterX className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
          <Button type="submit" className="w-full sm:w-auto shadow-md">
            <Search className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
        </div>
      </form>
    </Form>
  );
}
