
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
import { initialCategoriesData, initialExpensesData, initialPaymentMethodsData, initialCurrenciesData } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseFilters, type ExpenseFilterValues } from "@/components/expenses/expense-filters";
import { Search as SearchIcon } from "lucide-react"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useToast } from "@/hooks/use-toast";
import { getAllDescendantCategoryIds } from "@/lib/category-utils"; 

export default function SearchExpensesPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); 
  const [categories, setCategoriesState] = useState<Category[]>([]); // Renamed
  const [paymentMethods, setPaymentMethodsState] = useState<PaymentMethod[]>([]); // Renamed
  const [currencies, setCurrenciesState] = useState<Currency[]>([]); // Renamed
  
  const [activeFilters, setActiveFilters] = useState<ExpenseFilterValues>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const refreshAllExpensesState = React.useCallback(() => {
    setAllExpenses([...initialExpensesData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [initialExpensesData]);

  const refreshCategoriesState = React.useCallback(() => setCategoriesState([...initialCategoriesData]), [initialCategoriesData]);
  const refreshPaymentMethodsState = React.useCallback(() => setPaymentMethodsState([...initialPaymentMethodsData]), [initialPaymentMethodsData]);
  const refreshCurrenciesState = React.useCallback(() => setCurrenciesState([...initialCurrenciesData]), [initialCurrenciesData]);

  useEffect(() => {
    refreshAllExpensesState();
    refreshCategoriesState();
    refreshPaymentMethodsState();
    refreshCurrenciesState();
  }, [
      refreshAllExpensesState, 
      refreshCategoriesState,
      refreshPaymentMethodsState,
      refreshCurrenciesState,
      // Global arrays as direct dependencies
      initialExpensesData, 
      initialCategoriesData, 
      initialPaymentMethodsData, 
      initialCurrenciesData
    ]);

  const filteredExpenses = useMemo(() => {
    let currentlyFilteredExpenses = [...allExpenses]; 

    if (Object.keys(activeFilters).length > 0) {
        currentlyFilteredExpenses = allExpenses.filter(expense => {
        let match = true;

        if (activeFilters.dateRange?.from) {
            if (new Date(expense.date) < new Date(activeFilters.dateRange.from)) match = false;
        }
        if (match && activeFilters.dateRange?.to) {
            const toDate = new Date(activeFilters.dateRange.to);
            toDate.setHours(23, 59, 59, 999); 
            if (new Date(expense.date) > toDate) match = false;
        }

        if (match && activeFilters.subCategoryId) {
            if (expense.categoryId !== activeFilters.subCategoryId) match = false;
        } else if (match && activeFilters.mainCategoryId) {
            const descendantIds = getAllDescendantCategoryIds(activeFilters.mainCategoryId, categories);
            const categoryIdsToMatch = [activeFilters.mainCategoryId, ...descendantIds];
            if (!categoryIdsToMatch.includes(expense.categoryId)) match = false;
        }

        if (match && activeFilters.minAmount !== undefined) {
            if (expense.amount < activeFilters.minAmount) match = false;
        }

        if (match && activeFilters.maxAmount !== undefined) {
            if (expense.amount > activeFilters.maxAmount) match = false;
        }

        if (match && activeFilters.paymentMethodId) {
            if (expense.paymentMethodId !== activeFilters.paymentMethodId) match = false;
        }
        
        return match;
        });
    }
    return currentlyFilteredExpenses;

  }, [allExpenses, activeFilters, categories]);

  const handleApplyFilters = (filters: ExpenseFilterValues) => {
    setActiveFilters(filters);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = (data: Omit<Expense, "id">) => {
    if (!editingExpense) return;
    const indexInGlobal = initialExpensesData.findIndex(exp => exp.id === editingExpense.id);
    if (indexInGlobal !== -1) {
      initialExpensesData[indexInGlobal] = { ...initialExpensesData[indexInGlobal], ...data };
    }
    refreshAllExpensesState(); // Refresh the list on this page
    setEditingExpense(undefined);
    setIsFormOpen(false);
    toast({
      title: "Expense Updated",
      description: `"${data.description}" has been updated.`,
    });
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <SearchIcon className="mr-3 h-7 w-7 text-primary" />
            Search & Filter Expenses
          </CardTitle>
          <CardDescription>Refine your expense list using the filters below.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseFilters 
            categories={categories}
            paymentMethods={paymentMethods}
            onApplyFilters={handleApplyFilters}
            initialFilters={activeFilters}
          />
        </CardContent>
      </Card>

      <Card className="shadow-xl mt-6">
        <CardHeader>
          <CardTitle>Filtered Results</CardTitle>
          <CardDescription>
            Showing {filteredExpenses.length} of {allExpenses.length} expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseList 
            expenses={filteredExpenses} 
            categories={categories} 
            paymentMethods={paymentMethods}
            currencies={currencies}
            onEdit={handleEdit} 
            onDelete={() => {}} 
            sourcePageIdentifier="search"
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        setIsFormOpen(isOpen);
        if (!isOpen) setEditingExpense(undefined);
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the details of your expense.
            </DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              categories={categories}
              paymentMethods={paymentMethods}
              currencies={currencies}
              onSubmit={handleUpdateExpense}
              initialData={editingExpense}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    