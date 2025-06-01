
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getExpensesCol, updateExpenseDoc, deleteExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";

export default function PaymentMethodExpensesPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentMethodIdFromUrl = params.paymentMethodId as string;

  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod | undefined>(undefined);

  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [backButtonText, setBackButtonText] = useState("Back");
  const [backButtonAction, setBackButtonAction] = useState(() => () => router.back());
  const fromQueryParam = searchParams.get("from");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

  const fetchPageData = useCallback(async () => {
    if (!user || !paymentMethodIdFromUrl) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [
            allUserExpenses,
            fetchedUserCategories,
            fetchedUserPaymentMethods,
            fetchedUserCurrencies
        ] = await Promise.all([
            getExpensesCol(user.uid),
            getCategoriesCol(user.uid),
            getPaymentMethodsCol(user.uid),
            getCurrenciesCol(user.uid)
        ]);

        setUserCategories(fetchedUserCategories);
        setUserPaymentMethods(fetchedUserPaymentMethods);
        setUserCurrencies(fetchedUserCurrencies);

        const paymentMethod = fetchedUserPaymentMethods.find(pm => pm.id === paymentMethodIdFromUrl);
        setCurrentPaymentMethod(paymentMethod);

        const expensesForPaymentMethod = allUserExpenses
            .filter(exp => exp.paymentMethodId === paymentMethodIdFromUrl)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFilteredExpenses(expensesForPaymentMethod);

        if (fromQueryParam === "dashboard") setBackButtonText("Back to Dashboard");
        else if (fromQueryParam === "expenses") setBackButtonText("Back to Expenses");
        else if (fromQueryParam === "search") setBackButtonText("Back to Search Results");
        else if (fromQueryParam === "category") setBackButtonText("Back to Category View");
        else if (fromQueryParam === "overview") setBackButtonText("Back to Overview");
        else setBackButtonText("Back");

        setBackButtonAction(() => () => {
            if (fromQueryParam === "dashboard") router.push("/dashboard");
            else if (fromQueryParam === "expenses") router.push("/expenses");
            else if (fromQueryParam === "search") router.push("/expenses/search");
            else router.back();
        });

    } catch (error) {
        console.error("Error fetching payment method expenses:", error);
        toast({title: "Error", description: "Could not load expenses for this payment method.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, paymentMethodIdFromUrl, fromQueryParam, router, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = async (data: Omit<Expense, "id">) => {
    if (!user || !editingExpense) return;
    try {
      await updateExpenseDoc(user.uid, editingExpense.id, data);
      toast({ title: "Expense Updated", description: `"${data.description}" has been updated.` });
      fetchPageData();
      setEditingExpense(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
        toast({title: "Error", description: error.message || "Could not update expense.", variant: "destructive"});
    }
  };

  const handleDeleteExpenseClick = (expenseId: string) => {
    setExpenseToDeleteId(expenseId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!user || !expenseToDeleteId) return;
    try {
      await deleteExpenseDoc(user.uid, expenseToDeleteId);
      toast({ title: "Expense Deleted", description: "The expense has been removed.", variant: "destructive" });
      fetchPageData();
    } catch (error: any) {
      toast({ title: "Error Deleting Expense", description: error.message || "Could not delete expense.", variant: "destructive" });
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setExpenseToDeleteId(null);
    }
  };

  const pageTitle = currentPaymentMethod
    ? `Expenses for ${currentPaymentMethod.name}`
    : "Payment Method Expenses";

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading payment method expenses...</p></div>;
  }

  return (
    <>
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
              categories={userCategories}
              paymentMethods={userPaymentMethods}
              currencies={userCurrencies}
              onEdit={handleEdit}
              onDelete={handleDeleteExpenseClick}
              sourcePageIdentifier="payment-method"
            />
             {filteredExpenses.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-4">No expenses found for this payment method.</p>
             )}
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
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteExpense}>
              Yes, delete expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
