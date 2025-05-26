
"use client";

import React, { useState, useEffect } from "react";
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
import { 
    initialCategoriesData, 
    initialExpensesData, 
    initialCurrenciesData, 
    initialExchangeRatesData,
    initialBudgetGoalsData 
} from "@/lib/mock-data";
import { convertToBaseCurrency, getCurrencySymbol, BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { getCategoryNameWithHierarchy, getAllDescendantCategoryIds } from "@/lib/category-utils";

const calculateLocalSpentAmounts = (
    budgetGoals: Omit<Budget, 'spentAmount'>[], 
    expenses: Expense[],
    categories: Category[],
    currencies: Currency[],
    exchangeRates: ExchangeRate[]
): Budget[] => {
  return budgetGoals.map(budget => {
    const budgetCategory = categories.find(c => c.id === budget.categoryId);
    if (!budgetCategory) {
      console.warn(`Budget category with id ${budget.categoryId} not found for budget ${budget.id}.`);
      return { ...budget, spentAmount: 0 };
    }

    const categoryIdsToConsider = [budget.categoryId];
    const descendantIds = getAllDescendantCategoryIds(budget.categoryId, categories);
    categoryIdsToConsider.push(...descendantIds);
    const uniqueCategoryIdsToConsider = Array.from(new Set(categoryIdsToConsider));

    const spentAmountInBase = expenses
      .filter(exp => uniqueCategoryIdsToConsider.includes(exp.categoryId))
      .reduce((sum, exp) => {
        const amountInBase = convertToBaseCurrency(exp.amount, exp.currencyId, exchangeRates); // Removed categories
        return sum + amountInBase;
      }, 0);
    return { ...budget, spentAmount: spentAmountInBase };
  });
};


export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetGoals, setBudgetGoals] = useState<Omit<Budget, 'spentAmount'>[]>([]);
  
  const [categories, setCategoriesState] = useState<Category[]>([]); 
  const [expenses, setExpensesState] = useState<Expense[]>([]); 
  const [currencies, setCurrenciesState] = useState<Currency[]>([]); 
  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRate[]>([]); 
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
  const { toast } = useToast();
  const [baseCurrencySymbol, setBaseCurrencySymbolState] = useState<string>('$');


  const refreshBudgetGoalsState = React.useCallback(() => {
    setBudgetGoals([...initialBudgetGoalsData]);
  }, [initialBudgetGoalsData]);

  const refreshCategoriesState = React.useCallback(() => {
    setCategoriesState([...initialCategoriesData]);
  }, [initialCategoriesData]);

  const refreshExpensesState = React.useCallback(() => {
    setExpensesState([...initialExpensesData]);
  }, [initialExpensesData]);

  const refreshCurrenciesState = React.useCallback(() => {
    setCurrenciesState([...initialCurrenciesData]);
    setBaseCurrencySymbolState(getCurrencySymbol(BASE_CURRENCY_ID, initialCurrenciesData));
  }, [initialCurrenciesData]);

  const refreshExchangeRatesState = React.useCallback(() => {
    setExchangeRatesState([...initialExchangeRatesData]);
  }, [initialExchangeRatesData]);

  useEffect(() => {
    refreshCategoriesState();
    refreshCurrenciesState();
    refreshExchangeRatesState();
    refreshExpensesState();
    refreshBudgetGoalsState();
  }, [
    refreshBudgetGoalsState, 
    refreshCategoriesState, 
    refreshCurrenciesState, 
    refreshExchangeRatesState, 
    refreshExpensesState,
    initialCategoriesData,
    initialCurrenciesData,
    initialExchangeRatesData,
    initialExpensesData,
    initialBudgetGoalsData
  ]);
  
  useEffect(() => {
    if (budgetGoals.length > 0 || expenses.length > 0 || categories.length > 0) { 
        const updatedBudgets = calculateLocalSpentAmounts(budgetGoals, expenses, categories, currencies, exchangeRates);
        if (JSON.stringify(budgets) !== JSON.stringify(updatedBudgets)) {
            setBudgets(updatedBudgets);
        }
    }
  }, [budgetGoals, expenses, categories, currencies, exchangeRates, budgets]); 


  const handleSetBudget = (data: Omit<Budget, "id" | "spentAmount">) => {
    const newBudgetGoal: Omit<Budget, 'spentAmount'> = { ...data, id: `bud${Date.now()}` }; 
    initialBudgetGoalsData.push(newBudgetGoal); 
    refreshBudgetGoalsState(); 
    setIsFormOpen(false);
    setEditingBudget(undefined);
  };

  const handleUpdateBudget = (data: Omit<Budget, "id" | "spentAmount">) => {
    if (!editingBudget) return;
    const indexInGlobal = initialBudgetGoalsData.findIndex(goal => goal.id === editingBudget.id);
    if (indexInGlobal !== -1) {
      initialBudgetGoalsData[indexInGlobal] = { 
        ...initialBudgetGoalsData[indexInGlobal], 
        categoryId: data.categoryId, 
        goalAmount: data.goalAmount 
      };
    }
    refreshBudgetGoalsState(); 
    setEditingBudget(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (budget: Budget) => {
    const goalToEdit = initialBudgetGoalsData.find(g => g.id === budget.id);
    if (goalToEdit) {
        setEditingBudget(budget); 
        setIsFormOpen(true);
    }
  };

  const handleDelete = (budgetId: string) => {
    const indexInGlobal = initialBudgetGoalsData.findIndex(goal => goal.id === budgetId);
    if (indexInGlobal !== -1) {
      initialBudgetGoalsData.splice(indexInGlobal, 1);
    }
    refreshBudgetGoalsState(); 
    toast({
      title: "Budget Deleted",
      description: "The budget goal has been removed.",
      variant: "destructive"
    });
  };
  
  const availableCategoriesForNewBudget = categories.filter(cat => !initialBudgetGoalsData.some(b => b.categoryId === cat.id));

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
                    {editingBudget ? `Update the goal for ${getCategoryNameWithHierarchy(editingBudget.categoryId, categories)}. Amounts are in ${baseCurrencySymbol}.` : `Choose a category and set a spending limit in ${baseCurrencySymbol}.`}
                    </DialogDescription>
                </DialogHeader>
                <BudgetForm
                    categories={categories} 
                    availableCategoriesForNewBudget={editingBudget ? undefined : availableCategoriesForNewBudget}
                    onSubmit={editingBudget ? handleUpdateBudget : handleSetBudget}
                    existingBudget={editingBudget} 
                    baseCurrencySymbol={baseCurrencySymbol}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 && availableCategoriesForNewBudget.length === 0 && (
            <p className="text-muted-foreground text-center py-4">All categories have budgets set. Add more categories to create new budgets.</p>
          )}
           {budgets.length === 0 && availableCategoriesForNewBudget.length > 0 && (
            <p className="text-muted-foreground text-center py-4">No budgets set yet. Click "Set New Budget" to start.</p>
          )}
          <BudgetList 
            budgets={budgets} 
            categories={categories}
            baseCurrencySymbol={baseCurrencySymbol}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
