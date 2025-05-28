
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
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
import { useAuth } from "@/contexts/auth-context";
import { getAllDescendantCategoryIds } from "@/lib/category-utils"; 
import { getExpensesCol, updateExpenseDoc as updateFirestoreExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";

export default function SearchExpensesPage() {
  const { user } = useAuth();
  const [allUserExpenses, setAllUserExpenses] = useState<Expense[]>([]); 
  const [userCategories, setUserCategories] = useState<Category[]>([]); 
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]); 
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeFilters, setActiveFilters] = useState<ExpenseFilterValues>({});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const fetchPageData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedExpenses, 
        fetchedCategories, 
        fetchedPaymentMethods, 
        fetchedCurrencies
      ] = await Promise.all([
        getExpensesCol(user.uid),
        getCategoriesCol(user.uid),
        getPaymentMethodsCol(user.uid),
        getCurrenciesCol(user.uid)
      ]);
      setAllUserExpenses(fetchedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setUserCategories(fetchedCategories);
      setUserPaymentMethods(fetchedPaymentMethods);
      setUserCurrencies(fetchedCurrencies);
    } catch (error) {
        console.error("Error fetching search page data:", error);
        toast({title: "Error", description: "Could not load data for search.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);


  const filteredExpenses = useMemo(() => {
    let currentlyFilteredExpenses = [...allUserExpenses]; 

    if (Object.keys(activeFilters).length > 0) {
        currentlyFilteredExpenses = allUserExpenses.filter(expense => {
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
            const descendantIds = getAllDescendantCategoryIds(activeFilters.mainCategoryId, userCategories);
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

  }, [allUserExpenses, activeFilters, userCategories]);

  const handleApplyFilters = (filters: ExpenseFilterValues) => {
    setActiveFilters(filters);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = async (data: Omit<Expense, "id">) => {
    if (!user || !editingExpense) return;
    try {
      await updateFirestoreExpenseDoc(user.uid, editingExpense.id, data);
      toast({ title: "Expense Updated", description: `"${data.description}" has been updated.` });
      fetchPageData(); // Re-fetch all data to reflect changes in the list
      setEditingExpense(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({title: "Error", description: error.message || "Could not update expense.", variant: "destructive"});
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading search & filter...</p></div>;
  }

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
            categories={userCategories}
            paymentMethods={userPaymentMethods}
            onApplyFilters={handleApplyFilters}
            initialFilters={activeFilters}
          />
        </CardContent>
      </Card>

      <Card className="shadow-xl mt-6">
        <CardHeader>
          <CardTitle>Filtered Results</CardTitle>
          <CardDescription>
            Showing {filteredExpenses.length} of {allUserExpenses.length} expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseList 
            expenses={filteredExpenses} 
            categories={userCategories} 
            paymentMethods={userPaymentMethods}
            currencies={userCurrencies}
            onEdit={handleEdit} 
            onDelete={(expenseId) => { /* Deletion logic */
                 console.log("Delete requested for: ", expenseId);
                 toast({title: "Info", description: "Deletion from this view not fully implemented."});
            }} 
            sourcePageIdentifier="search"
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        setIsFormOpen(isOpen);
        if (!isOpen) setEditingExpense(undefined);
      }}>
        <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the details of your expense.
            </DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              categories={userCategories}
              paymentMethods={userPaymentMethods}
              currencies={userCurrencies}
              onSubmit={handleUpdateExpense}
              initialData={editingExpense}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
