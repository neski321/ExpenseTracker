
"use client"; // This layout needs to be a client component to use hooks

import React, { useState, useEffect, useCallback } from "react";
import { BudgetForm } from "@/components/budgets/budget-form";
import { BudgetList } from "@/components/budgets/budget-list";
import type { Budget, Category, Expense, Currency, ExchangeRate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { 
    convertToBaseCurrency, 
    getCurrencySymbol, 
    BASE_CURRENCY_ID 
} from "@/lib/currency-utils";
import { getCategoryNameWithHierarchy, getAllDescendantCategoryIds } from "@/lib/category-utils";

import { getCategoriesCol } from "@/lib/services/category-service";
import { getExpensesCol } from "@/lib/services/expense-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import { getExchangeRatesCol } from "@/lib/services/exchange-rate-service";
import {
  addBudgetGoalDoc,
  getBudgetGoalsCol,
  updateBudgetGoalDoc,
  deleteBudgetGoalDoc,
} from "@/lib/services/budget-goal-service";

// Type for budget goals stored in Firestore (doesn't have spentAmount or name)
type BudgetGoalStorage = Omit<Budget, "id" | "spentAmount" | "name"> & { id?: string };


const calculateLocalSpentAmounts = (
    budgetGoals: BudgetGoalStorage[], // These are Firestore-backed goals
    expenses: Expense[],
    categories: Category[],
    // currencies: Currency[], // Not directly needed if rates are to base
    exchangeRates: ExchangeRate[]
): Budget[] => {
  return budgetGoals.map(budgetGoal => {
    const budgetCategory = categories.find(c => c.id === budgetGoal.categoryId);
    if (!budgetCategory) {
      console.warn(`Budget category with id ${budgetGoal.categoryId} not found for budget ${budgetGoal.id}.`);
      return { ...budgetGoal, id: budgetGoal.id || "", name: "Error", spentAmount: 0, goalAmount: budgetGoal.goalAmount };
    }

    const categoryIdsToConsider = [budgetGoal.categoryId];
    if (budgetGoal.categoryId) { // Ensure categoryId is defined
      const descendantIds = getAllDescendantCategoryIds(budgetGoal.categoryId, categories);
      categoryIdsToConsider.push(...descendantIds);
    }
    const uniqueCategoryIdsToConsider = Array.from(new Set(categoryIdsToConsider));

    const spentAmountInBase = expenses
      .filter(exp => uniqueCategoryIdsToConsider.includes(exp.categoryId))
      .reduce((sum, exp) => {
        const amountInBase = convertToBaseCurrency(exp.amount, exp.currencyId, exchangeRates);
        return sum + amountInBase;
      }, 0);
    return { 
        id: budgetGoal.id || `temp-${Math.random()}`, // Ensure id is always present
        categoryId: budgetGoal.categoryId,
        goalAmount: budgetGoal.goalAmount,
        name: getCategoryNameWithHierarchy(budgetGoal.categoryId, categories), // Add name for display
        spentAmount: spentAmountInBase 
    };
  });
};


export default function BudgetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [budgetsWithSpent, setBudgetsWithSpent] = useState<Budget[]>([]); // Full budget objects with spent amounts
  const [userBudgetGoals, setUserBudgetGoals] = useState<BudgetGoalStorage[]>([]); // Goals from Firestore

  const [userCategories, setUserCategories] = useState<Category[]>([]); 
  const [userExpenses, setUserExpenses] = useState<Expense[]>([]); 
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]); 
  const [userExchangeRates, setUserExchangeRates] = useState<ExchangeRate[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined); // Use full Budget type for editing
  const [baseCurrencySymbol, setBaseCurrencySymbolState] = useState<string>('$');


  const fetchPageData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedGoals, 
        fetchedCategories, 
        fetchedExpenses, 
        fetchedCurrencies, 
        fetchedExchangeRates
      ] = await Promise.all([
        getBudgetGoalsCol(user.uid),
        getCategoriesCol(user.uid),
        getExpensesCol(user.uid),
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid)
      ]);
      
      setUserBudgetGoals(fetchedGoals.map(g => ({...g, id: g.id}))); // Ensure ID is mapped
      setUserCategories(fetchedCategories);
      setUserExpenses(fetchedExpenses);
      setUserCurrencies(fetchedCurrencies);
      setUserExchangeRates(fetchedExchangeRates);
      setBaseCurrencySymbolState(getCurrencySymbol(BASE_CURRENCY_ID, fetchedCurrencies));

    } catch (error) {
        console.error("Error fetching budget page data:", error);
        toast({title: "Error", description: "Could not load budget data.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  useEffect(() => {
    // This effect calculates the spent amounts whenever the underlying data changes.
    if (userBudgetGoals.length > 0 || userExpenses.length > 0 || userCategories.length > 0) { 
        const updatedBudgetsWithSpent = calculateLocalSpentAmounts(
            userBudgetGoals, 
            userExpenses, 
            userCategories, 
            userExchangeRates
        );
        // Only update if there's a meaningful change to prevent infinite loops
        if (JSON.stringify(budgetsWithSpent) !== JSON.stringify(updatedBudgetsWithSpent)) {
            setBudgetsWithSpent(updatedBudgetsWithSpent);
        }
    } else if (userBudgetGoals.length === 0 && budgetsWithSpent.length > 0) {
        // If no goals, clear the displayed budgets
        setBudgetsWithSpent([]);
    }
  }, [userBudgetGoals, userExpenses, userCategories, userExchangeRates, budgetsWithSpent]);


  const handleSetBudget = async (data: Omit<Budget, "id" | "spentAmount" | "name">) => {
    if(!user) return;
    try {
        await addBudgetGoalDoc(user.uid, data);
        toast({ title: "Budget Goal Added!", description: "Your new budget goal has been set."});
        fetchPageData(); // Refresh data from Firestore
        setIsFormOpen(false);
        setEditingBudget(undefined);
    } catch (error: any) {
        toast({title: "Error", description: error.message || "Could not add budget goal.", variant: "destructive"});
    }
  };

  const handleUpdateBudget = async (data: Omit<Budget, "id" | "spentAmount" | "name">) => {
    if (!user || !editingBudget) return;
    try {
        await updateBudgetGoalDoc(user.uid, editingBudget.id, data);
        toast({ title: "Budget Goal Updated!", description: "Your budget goal has been updated."});
        fetchPageData(); // Refresh data
        setEditingBudget(undefined);
        setIsFormOpen(false);
    } catch (error: any) {
        toast({title: "Error", description: error.message || "Could not update budget goal.", variant: "destructive"});
    }
  };

  const handleEdit = (budgetToEdit: Budget) => { // Expecting full Budget object from list
    setEditingBudget(budgetToEdit); 
    setIsFormOpen(true);
  };

  const handleDelete = async (budgetId: string) => {
    if(!user) return;
    try {
        await deleteBudgetGoalDoc(user.uid, budgetId);
        toast({ title: "Budget Deleted", description: "The budget goal has been removed.", variant: "destructive" });
        fetchPageData(); // Refresh data
    } catch (error: any) {
        toast({title: "Error", description: error.message || "Could not delete budget goal.", variant: "destructive"});
    }
  };
  
  // Available categories for new budget: those that don't already have a budget goal set
  const availableCategoriesForNewBudget = userCategories.filter(cat => 
    !userBudgetGoals.some(b => b.categoryId === cat.id)
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading budgets...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Budget Goals</CardTitle>
            <CardDescription>Set and track spending targets (in {baseCurrencySymbol}). Parent category budgets include spending from their sub-categories.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
             setIsFormOpen(isOpen);
             if (!isOpen) setEditingBudget(undefined); 
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md" disabled={!editingBudget && availableCategoriesForNewBudget.length === 0}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingBudget ? "Edit Budget" : "Set New Budget"}
              </Button>
            </DialogTrigger>
             <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingBudget ? "Edit Budget Goal" : "Set New Budget Goal"}</DialogTitle>
                    <DialogDescription>
                    {editingBudget ? `Update the goal for ${getCategoryNameWithHierarchy(editingBudget.categoryId, userCategories)}. Amounts are in ${baseCurrencySymbol}.` : `Choose a category and set a spending limit in ${baseCurrencySymbol}.`}
                    </DialogDescription>
                </DialogHeader>
                <BudgetForm
                    categories={userCategories} // All user categories for hierarchical select
                    availableCategoriesForNewBudget={editingBudget ? undefined : availableCategoriesForNewBudget}
                    onSubmit={editingBudget ? handleUpdateBudget : handleSetBudget}
                    existingBudget={editingBudget} // Pass the full Budget object if editing
                    baseCurrencySymbol={baseCurrencySymbol}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {budgetsWithSpent.length === 0 && availableCategoriesForNewBudget.length === 0 && (
            <p className="text-muted-foreground text-center py-4">All categories have budgets set. Add more categories to create new budgets.</p>
          )}
           {budgetsWithSpent.length === 0 && availableCategoriesForNewBudget.length > 0 && !isLoading && (
            <p className="text-muted-foreground text-center py-4">No budgets set yet. Click "Set New Budget" to start.</p>
          )}
          <BudgetList 
            budgets={budgetsWithSpent} 
            categories={userCategories}
            baseCurrencySymbol={baseCurrencySymbol}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
