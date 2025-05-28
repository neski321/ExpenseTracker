
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, PaymentMethod, Category, Currency } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/contexts/auth-context";
import { getMonth, getYear, getISOWeek, startOfWeek, endOfWeek, format, isValid } from 'date-fns';
import { getExpensesCol, updateExpenseDoc as updateFirestoreExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";

interface ExpensesByWeek {
  [weekKey: string]: { 
    weekLabel: string;
    expenses: Expense[];
    weekNumber: number;
    year: number;
  };
}

const groupExpensesByWeek = (expensesForMonth: Expense[], targetYear: number, targetMonth: number): ExpensesByWeek => {
  const grouped: ExpensesByWeek = {};
  expensesForMonth.forEach(expense => {
    if (!isValid(new Date(expense.date))) return; 
    if (getYear(new Date(expense.date)) !== targetYear || getMonth(new Date(expense.date)) !== targetMonth) {
        return;
    }
    const expenseYear = getYear(new Date(expense.date));
    const weekNumber = getISOWeek(new Date(expense.date));
    const weekKey = `${expenseYear}-${weekNumber}`;

    if (!grouped[weekKey]) {
      const firstDayOfWeek = startOfWeek(new Date(expense.date), { weekStartsOn: 1 }); 
      const lastDayOfWeek = endOfWeek(new Date(expense.date), { weekStartsOn: 1 });
      grouped[weekKey] = {
        weekLabel: `Week ${weekNumber} (${format(firstDayOfWeek, 'MMM d')} - ${format(lastDayOfWeek, 'MMM d, yyyy')})`,
        expenses: [],
        weekNumber: weekNumber,
        year: expenseYear,
      };
    }
    grouped[weekKey].expenses.push(expense);
  });
  return Object.fromEntries(Object.entries(grouped).sort(([, a], [, b]) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  }));
};


export default function MonthlyExpensesOverviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const year = parseInt(params.year as string);
  const month = parseInt(params.month as string) - 1; 

  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [activeTab, setActiveTab] = useState("monthly");
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();

  const fetchPageData = useCallback(async () => {
    if (!user || isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      setIsLoading(false);
      setMonthlyExpenses([]);
      console.error("Invalid user, year, or month params for monthly overview.");
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
        getYear(new Date(exp.date)) === year &&
        getMonth(new Date(exp.date)) === month
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMonthlyExpenses(filtered);

    } catch (error) {
        console.error("Error fetching monthly overview data:", error);
        toast({title: "Error", description: "Could not load data for this month.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, year, month, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const weeklyGroupedExpenses = useMemo(() => {
    if (activeTab === 'weekly') {
      return groupExpensesByWeek(monthlyExpenses, year, month);
    }
    return {};
  }, [monthlyExpenses, year, month, activeTab]);

  const monthName = isValid(new Date(year, month)) ? format(new Date(year, month), "MMMM") : "Invalid Month";
  const pageTitle = `Expenses for ${monthName} ${year}`;

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = async (data: Omit<Expense, "id">) => {
    if (!user || !editingExpense) return;
    try {
      await updateFirestoreExpenseDoc(user.uid, editingExpense.id, data);
      toast({ title: "Expense Updated", description: `"${data.description}" has been updated.` });
      fetchPageData(); // Re-fetch all data
      setEditingExpense(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
        toast({title: "Error", description: error.message || "Could not update expense.", variant: "destructive"});
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading monthly expenses...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">{pageTitle}</CardTitle>
          <CardDescription>View your expenses for this period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-4">
              <TabsTrigger value="monthly">Monthly View</TabsTrigger>
              <TabsTrigger value="weekly">Weekly View</TabsTrigger>
              <TabsTrigger value="yearly" asChild>
                <Link href={`/expenses/overview/${year}`}>Yearly View ({year})</Link>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <ExpenseList 
                expenses={monthlyExpenses} 
                categories={userCategories} 
                paymentMethods={userPaymentMethods}
                currencies={userCurrencies} 
                onEdit={handleEdit} 
                onDelete={(expenseId) => { /* Deletion logic */
                     console.log("Delete requested for: ", expenseId);
                     toast({title: "Info", description: "Deletion from this view not fully implemented."});
                }}  
                sourcePageIdentifier="overview"
              />
            </TabsContent>
            <TabsContent value="weekly">
              {Object.keys(weeklyGroupedExpenses).length > 0 ? (
                Object.entries(weeklyGroupedExpenses).map(([weekKey, weekData]) => (
                  <div key={weekKey} className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-primary">{weekData.weekLabel}</h3>
                    <ExpenseList 
                      expenses={weekData.expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())} 
                      categories={userCategories} 
                      paymentMethods={userPaymentMethods}
                      currencies={userCurrencies} 
                      onEdit={handleEdit} 
                      onDelete={(expenseId) => { /* Deletion logic */ 
                        console.log("Delete requested for: ", expenseId);
                        toast({title: "Info", description: "Deletion from this view not fully implemented."});
                      }} 
                      sourcePageIdentifier="overview"
                    />
                  </div>
                ))
              ) : (
                 activeTab === 'weekly' && !isLoading && <p className="text-muted-foreground text-center py-4">No expenses to display for this view.</p>
              )}
            </TabsContent>
          </Tabs>
           {monthlyExpenses.length === 0 && activeTab === 'monthly' && !isLoading && (
             <p className="text-muted-foreground text-center py-4">No expenses recorded for this month.</p>
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
