
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, PaymentMethod, Category, Currency } from "@/lib/types";
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
import { getYear, isValid } from 'date-fns';
import { getExpensesCol, updateExpenseDoc, deleteExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";

export default function YearlyExpensesOverviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const year = parseInt(params.year as string);

  const [yearlyExpenses, setYearlyExpenses] = useState<Expense[]>([]);
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

  const fetchPageData = useCallback(async () => {
    if (!user || isNaN(year)) {
      setIsLoading(false);
      setYearlyExpenses([]);
      console.error("Invalid user or year param for yearly overview.");
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
        getCurrenciesCol(user.uid),
      ]);

      setUserCategories(fetchedUserCategories);
      setUserPaymentMethods(fetchedUserPaymentMethods);
      setUserCurrencies(fetchedUserCurrencies);

      const filtered = allUserExpenses.filter(exp =>
        isValid(new Date(exp.date)) &&
        getYear(new Date(exp.date)) === year
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setYearlyExpenses(filtered);

    } catch (error) {
      console.error("Error fetching yearly overview data:", error);
      toast({title: "Error", description: "Could not load data for this year.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [user, year, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const pageTitle = `Expenses for ${year}`;

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
      fetchPageData(); // Re-fetch to update list
    } catch (error: any) {
      toast({ title: "Error Deleting Expense", description: error.message || "Could not delete expense.", variant: "destructive" });
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setExpenseToDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading yearly expenses...</p></div>;
  }

  return (
    <>
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
              categories={userCategories}
              paymentMethods={userPaymentMethods}
              currencies={userCurrencies}
              onEdit={handleEdit}
              onDelete={handleDeleteExpenseClick}
              sourcePageIdentifier="overview"
            />
              {yearlyExpenses.length === 0 && !isLoading && (
               <p className="text-muted-foreground text-center py-4">No expenses recorded for this year.</p>
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
