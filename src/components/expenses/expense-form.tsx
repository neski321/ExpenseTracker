
"use client";

import type { z as zodType } from "zod"; 
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Expense, PaymentMethod, Currency } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod"; 
import React, { useEffect, useState } from "react";
import { BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { getHierarchicalCategoryOptions, type HierarchicalCategoryOption } from "@/lib/category-utils";
import { suggestCategory, type SuggestCategoryInput } from "@/ai/flows/suggest-category-flow";

const FORM_NO_PAYMENT_METHOD_VALUE = "__no_payment_method_selected__";

const expenseFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters.").max(100),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date(),
  categoryId: z.string().min(1, "Please select a category."),
  paymentMethodId: z.string().optional(),
  currencyId: z.string().min(1, "Please select a currency."),
  isSubscription: z.boolean().optional(),
  nextDueDate: z.date().optional(),
}).refine(data => {
  if (data.isSubscription && !data.nextDueDate) {
    return false;
  }
  return true;
}, {
  message: "Next due date is required for subscriptions.",
  path: ["nextDueDate"], 
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  categories: Category[]; // This is the flat list of all categories
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
  onSubmit: (data: ExpenseFormValues) => void;
  initialData?: Expense;
}

export function ExpenseForm({ categories, paymentMethods, currencies, onSubmit, initialData }: ExpenseFormProps) {
  const { toast } = useToast();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      amount: initialData.amount,
      paymentMethodId: initialData.paymentMethodId || FORM_NO_PAYMENT_METHOD_VALUE, 
      currencyId: initialData.currencyId || BASE_CURRENCY_ID, 
      isSubscription: initialData.isSubscription || false,
      nextDueDate: initialData.nextDueDate ? new Date(initialData.nextDueDate) : undefined,
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      categoryId: "",
      paymentMethodId: FORM_NO_PAYMENT_METHOD_VALUE, 
      currencyId: BASE_CURRENCY_ID, 
      isSubscription: false,
      nextDueDate: undefined,
    },
  });

  const isSubscription = form.watch("isSubscription");
  const hierarchicalCategoriesForSelect: HierarchicalCategoryOption[] = React.useMemo(
    () => getHierarchicalCategoryOptions(categories), 
    [categories]
  );
  
  const categoriesForAISuggestion = React.useMemo(() => {
    return categories.map(cat => ({ id: cat.id, name: cat.name, parentId: cat.parentId }));
  }, [categories]);


  useEffect(() => {
    if (!isSubscription) {
      form.setValue("nextDueDate", undefined);
      form.clearErrors("nextDueDate");
    }
  }, [isSubscription, form]);

  async function handleSuggestCategory() {
    const description = form.getValues("description");
    if (!description || description.trim().length < 3) {
      toast({
        title: "Suggestion Failed",
        description: "Please enter a description (at least 3 characters) to get a category suggestion.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingCategory(true);
    try {
      const suggestionInput: SuggestCategoryInput = {
        description,
        allCategories: categoriesForAISuggestion,
      };
      const result = await suggestCategory(suggestionInput);
      
      if (result.suggestedCategoryId) {
        form.setValue("categoryId", result.suggestedCategoryId, { shouldValidate: true });
        toast({
          title: "Category Suggested!",
          description: result.reasoning || `Set to ${hierarchicalCategoriesForSelect.find(c => c.value === result.suggestedCategoryId)?.label || 'selected category'}.`,
        });
      } else {
        toast({
          title: "No Suggestion",
          description: result.reasoning || "Could not determine a specific category.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
      toast({
        title: "Suggestion Error",
        description: "Failed to get category suggestion. Please try again or select manually.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingCategory(false);
    }
  }

  function handleSubmit(data: ExpenseFormValues) {
    const submissionData = { ...data };
    if (!submissionData.isSubscription) {
      submissionData.nextDueDate = undefined;
    }
    if (submissionData.paymentMethodId === FORM_NO_PAYMENT_METHOD_VALUE) {
        submissionData.paymentMethodId = undefined;
    }
    onSubmit(submissionData);
    const selectedCurrency = currencies.find(c => c.id === submissionData.currencyId);
    const categoryName = hierarchicalCategoriesForSelect.find(c => c.value === submissionData.categoryId)?.originalName || "Category";
    
    toast({
      title: initialData ? "Expense Updated!" : "Expense Added!",
      description: `${submissionData.isSubscription ? "Subscription for " : ""}${submissionData.description} (${categoryName}) for ${selectedCurrency?.symbol || ''}${submissionData.amount.toFixed(2)}.`,
    });
    if (!initialData) {
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        categoryId: "",
        paymentMethodId: FORM_NO_PAYMENT_METHOD_VALUE,
        currencyId: BASE_CURRENCY_ID,
        isSubscription: false,
        nextDueDate: undefined,
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
                <Input placeholder="e.g., Groceries, Netflix" {...field} />
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
                <FormLabel>Date of Expense</FormLabel>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {hierarchicalCategoriesForSelect.map((categoryOpt) => (
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
             <Button 
              type="button" 
              variant="outline" 
              onClick={handleSuggestCategory} 
              disabled={isSuggestingCategory}
              className="w-full md:w-auto mb-1" // mb-1 to align with FormMessage spacing if select is invalid
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {isSuggestingCategory ? "Suggesting..." : "Suggest Category"}
            </Button>
        </div>
        <FormField
        control={form.control}
        name="paymentMethodId"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Payment Method (Optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || FORM_NO_PAYMENT_METHOD_VALUE} defaultValue={field.value || FORM_NO_PAYMENT_METHOD_VALUE}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                <SelectItem value={FORM_NO_PAYMENT_METHOD_VALUE}><em>None</em></SelectItem>
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
          name="isSubscription"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Is this a recurring subscription?
                </FormLabel>
                <FormDescription>
                  Check if this expense occurs regularly (e.g., monthly, yearly).
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {isSubscription && (
          <FormField
            control={form.control}
            name="nextDueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Next Due Date</FormLabel>
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
                          <span>Pick next due date</span>
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Set the date for the next billing cycle.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {initialData ? "Update Expense" : "Add Expense"}
        </Button>
      </form>
    </Form>
  );
}
