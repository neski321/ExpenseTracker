
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
import { initialCategoriesData, initialExpensesData, initialPaymentMethodsData, initialCurrenciesData } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useToast } from "@/hooks/use-toast";

export default function PaymentMethodExpensesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentMethodIdFromUrl = params.paymentMethodId as string;

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);

  const [backButtonText, setBackButtonText] = useState("Back");
  const [backButtonAction, setBackButtonAction] = useState(() => () => router.back());
  const fromQueryParam = searchParams.get("from");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const loadAndSetExpenses = () => {
    const expensesForPaymentMethod = initialExpensesData
      .filter(exp => exp.paymentMethodId === paymentMethodIdFromUrl)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredExpenses(expensesForPaymentMethod);
  };

  useEffect(() => {
    const paymentMethod = initialPaymentMethodsData.find(pm => pm.id === paymentMethodIdFromUrl);
    setCurrentPaymentMethod(paymentMethod);

    loadAndSetExpenses();

    setAllCategories(initialCategoriesData);
    setAllPaymentMethods(initialPaymentMethodsData);
    setAllCurrencies(initialCurrenciesData);
    
    if (fromQueryParam === "dashboard") {
      setBackButtonText("Back to Dashboard");
      setBackButtonAction(() => () => router.push("/dashboard"));
    } else if (fromQueryParam === "budgets") {
      setBackButtonText("Back to Budgets");
      setBackButtonAction(() => () => router.push("/budgets"));
    } else if (fromQueryParam === "expenses") {
      setBackButtonText("Back to Expenses");
      setBackButtonAction(() => () => router.push("/expenses"));
    } else if (fromQueryParam === "search") {
      setBackButtonText("Back to Search Results");
      setBackButtonAction(() => () => router.push("/expenses/search"));
    } else if (fromQueryParam === "categories" || fromQueryParam === "category") { 
      setBackButtonText("Back to Category View");
      // This might need to be more specific if we know which category page it came from
      setBackButtonAction(() => () => router.back()); 
    } else if (fromQueryParam === "overview") {
      setBackButtonText("Back to Overview"); 
      setBackButtonAction(() => () => router.back());
    } else {
      setBackButtonText("Back");
      setBackButtonAction(() => () => router.back());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethodIdFromUrl, searchParams, router]); 

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
    loadAndSetExpenses(); // Reload and re-filter local state
    setEditingExpense(undefined);
    setIsFormOpen(false);
    toast({
      title: "Expense Updated",
      description: `"${data.description}" has been updated.`,
    });
  };

  const pageTitle = currentPaymentMethod 
    ? `Expenses for ${currentPaymentMethod.name}` 
    : "Payment Method Expenses";

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={backButtonAction} className="mb-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> {backButtonText}
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <CreditCard className="mr-3 h-6 w-6 text-primary" />
            {pageTitle}
          </CardTitle>
          <CardDescription>Showing all expenses paid with this method, sorted by most recent.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseList
            expenses={filteredExpenses}
            categories={allCategories} 
            paymentMethods={allPaymentMethods}
            currencies={allCurrencies}
            onEdit={handleEdit} 
            onDelete={() => {}} // Keep delete as no-op for now, or implement if desired
            sourcePageIdentifier="payment-method" 
          />
           {filteredExpenses.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No expenses found for this payment method.</p>
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
