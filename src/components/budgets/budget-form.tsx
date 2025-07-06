"use client";

import type { z as zodType } from "zod"; 
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Budget } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { z as zod } from "zod"; 
import React, { useEffect } from "react";
import { getHierarchicalCategoryOptions } from "@/lib/category-utils";

const budgetFormSchema = zod.object({
  categoryId: zod.string().min(1, "Please select a category."),
  goalAmount: zod.coerce.number().positive("Goal amount must be positive."),
});

type BudgetFormValues = zod.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  categories: Category[]; // All categories for hierarchical select
  availableCategoriesForNewBudget?: Category[]; // Used if existingBudget is undefined, for filtering
  onSubmit: (data: BudgetFormValues) => void;
  existingBudget?: Budget; 
  baseCurrencySymbol: string;
}

export function BudgetForm({ 
  categories, 
  availableCategoriesForNewBudget, 
  onSubmit, 
  existingBudget, 
  baseCurrencySymbol 
}: BudgetFormProps) {
  const { toast } = useToast();
  
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: existingBudget ? {
      categoryId: existingBudget.categoryId,
      goalAmount: existingBudget.goalAmount,
    } : {
      categoryId: "",
      goalAmount: 0,
    },
  });
  
  // Reset form when existingBudget changes (for editing)
  useEffect(() => {
    if (existingBudget) {
      form.reset({
        categoryId: existingBudget.categoryId,
        goalAmount: existingBudget.goalAmount,
      });
    } else {
      form.reset({
        categoryId: "",
        goalAmount: 0,
      });
    }
  }, [existingBudget, form]);
  
  // Generate hierarchical options for the dropdown
  // If editing, all categories are potentially available (though the field is disabled).
  // If new, use availableCategoriesForNewBudget if provided, otherwise all categories.
  const categoriesToDisplay = existingBudget ? categories : (availableCategoriesForNewBudget || categories);
  const hierarchicalCategorySelectOptions = React.useMemo(
    () => getHierarchicalCategoryOptions(categoriesToDisplay), 
    [categoriesToDisplay]
  );

  // Get the original name for the toast message
  const allHierarchicalOptions = React.useMemo(() => getHierarchicalCategoryOptions(categories), [categories]);


  function handleSubmit(data: BudgetFormValues) {
    onSubmit(data);
    const categoryName = allHierarchicalOptions.find(c => c.value === data.categoryId)?.originalName || "Category";
     toast({
      title: existingBudget ? "Budget Updated!" : "Budget Set!",
      description: `Budget for ${categoryName} set to ${baseCurrencySymbol}${data.goalAmount.toFixed(2)}.`,
    });
    if (!existingBudget) {
        form.reset({ categoryId: "", goalAmount: 0}); 
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value} 
                value={field.value || ""}
                disabled={!!existingBudget}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category for the budget" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hierarchicalCategorySelectOptions.map((categoryOpt) => (
                    <SelectItem key={categoryOpt.value} value={categoryOpt.value}>
                      {categoryOpt.label}
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
          name="goalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Amount (in {baseCurrencySymbol})</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                    {baseCurrencySymbol}
                  </span>
                  <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingBudget ? "Update Budget" : "Set Budget"}
        </Button>
      </form>
    </Form>
  );
}
