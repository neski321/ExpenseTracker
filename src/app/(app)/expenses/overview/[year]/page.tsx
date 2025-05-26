
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, PaymentMethod, Category, Currency } from "@/lib/types"; 
import { initialCategoriesData, initialExpensesData, initialPaymentMethodsData, initialCurrenciesData } from "@/lib/mock-data"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useToast } from "@/hooks/use-toast";
import { getYear, isValid } from 'date-fns';

export default function YearlyExpensesOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const year = parseInt(params.year as string);

  const [yearlyExpenses, setYearlyExpenses] = useState<Expense[]>([]);
  const [allPaymentMethods, setAllPaymentMethodsState] = useState<PaymentMethod[]>([]); // Renamed
  const [allCategories, setAllCategoriesState] = useState<Category[]>([]); // Renamed
  const [allCurrencies, setAllCurrenciesState] = useState<Currency[]>([]); // Renamed

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const loadYearlyExpenses = React.useCallback(() => {
    if (isNaN(year)) {
      console.error("Invalid year param");
      setYearlyExpenses([]);
      return;
    }
    const filtered = initialExpensesData.filter(exp => 
      isValid(new Date(exp.date)) &&
      getYear(new Date(exp.date)) === year
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setYearlyExpenses(filtered);
  }, [year, initialExpensesData]); // Added initialExpensesData dependency

  const refreshAllPaymentMethods = React.useCallback(() => setAllPaymentMethodsState([...initialPaymentMethodsData]), [initialPaymentMethodsData]);
  const refreshAllCategories = React.useCallback(() => setAllCategoriesState([...initialCategoriesData]), [initialCategoriesData]);
  const refreshAllCurrencies = React.useCallback(() => setAllCurrenciesState([...initialCurrenciesData]), [initialCurrenciesData]);

  useEffect(() => {
    loadYearlyExpenses();
    refreshAllPaymentMethods();
    refreshAllCategories();
    refreshAllCurrencies();
  }, [
      year, 
      loadYearlyExpenses,
      refreshAllPaymentMethods,
      refreshAllCategories,
      refreshAllCurrencies,
      // Global arrays as direct dependencies
      initialExpensesData,
      initialPaymentMethodsData,
      initialCategoriesData,
      initialCurrenciesData
    ]);

  const pageTitle = `Expenses for ${year}`;

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
    loadYearlyExpenses(); // Refresh the list on this page
    setEditingExpense(undefined);
    setIsFormOpen(false);
    toast({
      title: "Expense Updated",
      description: `"${data.description}" has been updated.`,
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">{pageTitle}</CardTitle>
          <CardDescription>View all your expenses for the year {year}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseList 
            expenses={yearlyExpenses} 
            categories={allCategories} 
            paymentMethods={allPaymentMethods}
            currencies={allCurrencies} 
            onEdit={handleEdit} 
            onDelete={() => {}} 
            sourcePageIdentifier="overview"
          />
            {yearlyExpenses.length === 0 && (
             <p className="text-muted-foreground text-center py-4">No expenses recorded for this year.</p>
           )}
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
              categories={allCategories}
              paymentMethods={allPaymentMethods}
              currencies={allCurrencies}
              onSubmit={handleUpdateExpense}
              initialData={editingExpense}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    