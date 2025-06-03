
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency, ExchangeRate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getAllDescendantCategoryIds, getCategoryNameWithHierarchy } from "@/lib/category-utils";
import { getExpensesCol, updateExpenseDoc, deleteExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import { getExchangeRatesCol } from "@/lib/services/exchange-rate-service";
import { SubCategorySpendingChart } from "@/components/charts/sub-category-spending-chart";
import {
  getYear,
  getMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  isValid,
  format,
} from 'date-fns';

type FilterPeriod = "all" | "year" | "month" | "week";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SubCategoryOverviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const mainCategoryId = params.mainCategoryId as string;

  const [mainCategory, setMainCategory] = useState<Category | undefined>(undefined);
  const [allUserCategories, setAllUserCategories] = useState<Category[]>([]);
  const [allUserExpenses, setAllUserExpenses] = useState<Expense[]>([]); // This is the raw list for filtering
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [userExchangeRates, setUserExchangeRates] = useState<ExchangeRate[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [activeFilterPeriod, setActiveFilterPeriod] = useState<FilterPeriod>("all");
  const [selectedFilterYear, setSelectedFilterYear] = useState<number | "all">("all");
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<number | "all">("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchPageData = useCallback(async () => {
    if (!user || !mainCategoryId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedCategories,
        fetchedExpenses, // This is the full list of user expenses
        fetchedPaymentMethods,
        fetchedCurrencies,
        fetchedExchangeRates,
      ] = await Promise.all([
        getCategoriesCol(user.uid),
        getExpensesCol(user.uid), // Fetch all expenses for year/month dropdown population
        getPaymentMethodsCol(user.uid),
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid),
      ]);

      setAllUserCategories(fetchedCategories);
      setAllUserExpenses(fetchedExpenses); // Set all user expenses
      setUserPaymentMethods(fetchedPaymentMethods);
      setUserCurrencies(fetchedCurrencies);
      setUserExchangeRates(fetchedExchangeRates);

      const currentMainCat = fetchedCategories.find(c => c.id === mainCategoryId);
      setMainCategory(currentMainCat);

      if (fetchedExpenses.length > 0) {
        const years = Array.from(new Set(fetchedExpenses.map(exp => getYear(new Date(exp.date)))))
          .sort((a, b) => b - a);
        setAvailableYears(years);
      } else {
        setAvailableYears([]);
      }

    } catch (error) {
      console.error("Error fetching sub-category overview data:", error);
      toast({ title: "Error", description: "Could not load data for this overview.", variant: "destructive" });
      router.push("/categories"); 
    } finally {
      setIsLoading(false);
    }
  }, [user, mainCategoryId, toast, router]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const periodFilteredExpenses = useMemo(() => {
    if (!allUserExpenses) return [];
    const now = new Date();
    let expensesToFilter = [...allUserExpenses];

    if (selectedFilterYear !== "all") {
      expensesToFilter = expensesToFilter.filter(exp => getYear(new Date(exp.date)) === selectedFilterYear);
      if (selectedFilterMonth !== "all") {
        expensesToFilter = expensesToFilter.filter(exp => getMonth(new Date(exp.date)) === selectedFilterMonth);
      }
      return expensesToFilter; // Return directly after year/month select filtering
    }
    
    // Fallback to tab-based activeFilterPeriod
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    switch (activeFilterPeriod) {
      case "week":
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        break;
      case "year":
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
        break;
      case "all":
      default:
        return expensesToFilter;
    }

    if (periodStart && periodEnd) {
      return expensesToFilter.filter(exp =>
        isValid(new Date(exp.date)) && isWithinInterval(new Date(exp.date), { start: periodStart!, end: periodEnd! })
      );
    }
    return expensesToFilter;
  }, [allUserExpenses, activeFilterPeriod, selectedFilterYear, selectedFilterMonth]);


  const expensesForMainCategoryAndDescendants = useMemo(() => {
    if (!mainCategory || !periodFilteredExpenses) return []; // Use periodFilteredExpenses
    const descendantIds = getAllDescendantCategoryIds(mainCategory.id, allUserCategories);
    const categoryIdsToConsider = Array.from(new Set([mainCategory.id, ...descendantIds]));
    return periodFilteredExpenses
      .filter(exp => categoryIdsToConsider.includes(exp.categoryId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mainCategory, allUserCategories, periodFilteredExpenses]);

  const getDynamicPeriodDescription = () => {
    const now = new Date();
    if (selectedFilterYear !== "all") {
      const yearStr = selectedFilterYear.toString();
      const monthStr = selectedFilterMonth !== "all" ? monthNames[selectedFilterMonth] + " " : "";
      return `for ${monthStr}${yearStr}`;
    }
    switch(activeFilterPeriod) {
      case "week":
        return `for the current week (${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(now, { weekStartsOn: 1 }), 'MMM d, yyyy')})`;
      case "month":
        return `for the current month (${format(now, 'MMMM yyyy')})`;
      case "year":
        return `for the current year (${format(now, 'yyyy')})`;
      case "all":
      default:
        return `across all time`;
    }
  };
  
  const getTabDescription = (context: 'chart' | 'list') => {
    const dynamicPeriod = getDynamicPeriodDescription();
    let base = "";
    if (context === 'chart') {
      base = `Spending breakdown for sub-categories of ${mainCategory?.name || 'this category'}`;
    } else {
      base = `Expenses for ${getCategoryNameWithHierarchy(mainCategory?.id || "", allUserCategories)}, including sub-categories,`;
    }
    return `${base} ${dynamicPeriod}.`;
  };
  
  const handleFilterTabChange = (value: string) => {
    setActiveFilterPeriod(value as FilterPeriod);
    setSelectedFilterYear("all");
    setSelectedFilterMonth("all");
  };

  const handleYearSelectChange = (value: string) => {
    const yearValue = value === "all" ? "all" : parseInt(value);
    setSelectedFilterYear(yearValue);
    if (yearValue === "all") {
      setSelectedFilterMonth("all");
    }
  };

  const handleMonthSelectChange = (value: string) => {
    setSelectedFilterMonth(value === "all" ? "all" : parseInt(value));
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpenseSubmit = async (data: Omit<Expense, "id">) => {
    if (!user || !editingExpense) return;
    try {
      await updateExpenseDoc(user.uid, editingExpense.id, data);
      toast({ title: "Expense Updated", description: `"${data.description}" has been updated.` });
      fetchPageData(); 
      setEditingExpense(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update expense.", variant: "destructive" });
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading sub-category overview...</p></div>;
  }

  if (!mainCategory) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-destructive mb-4">Main category not found.</p>
        <Button onClick={() => router.push("/categories")}>Back to Categories</Button>
      </div>
    );
  }
  
  const directSubCategories = allUserCategories.filter(c => c.parentId === mainCategory.id);

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push("/categories")} className="mb-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Categories
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-2xl">Sub-Category Spending for: {mainCategory.name}</CardTitle>
              <CardDescription>{getTabDescription('chart')}</CardDescription>
            </div>
          </div>
          <Tabs value={activeFilterPeriod} onValueChange={handleFilterTabChange} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Select value={selectedFilterYear.toString()} onValueChange={handleYearSelectChange}>
              <SelectTrigger className="w-full sm:w-[180px] shadow-sm">
                <SelectValue placeholder="Filter by Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedFilterMonth === "all" ? "all" : selectedFilterMonth.toString()}
              onValueChange={handleMonthSelectChange}
              disabled={selectedFilterYear === "all"}
            >
              <SelectTrigger className="w-full sm:w-[180px] shadow-sm">
                <SelectValue placeholder="Filter by Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((name, index) => (
                  <SelectItem key={index} value={index.toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {directSubCategories.length > 0 ? (
            <SubCategorySpendingChart
              mainCategory={mainCategory}
              allCategories={allUserCategories}
              expensesToDisplay={periodFilteredExpenses} 
              allCurrencies={userCurrencies}
              allExchangeRates={userExchangeRates}
            />
          ) : (
            <p className="text-muted-foreground text-center py-4">This main category has no sub-categories with spending to display for the selected period.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex items-center gap-3">
            <ListChecks className="h-7 w-7 text-primary" />
            <div>
                <CardTitle className="text-2xl">All Expenses for: {getCategoryNameWithHierarchy(mainCategory.id, allUserCategories)}</CardTitle>
                <CardDescription>{getTabDescription('list')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ExpenseList
            expenses={expensesForMainCategoryAndDescendants} 
            categories={allUserCategories}
            paymentMethods={userPaymentMethods}
            currencies={userCurrencies}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpenseClick}
            sourcePageIdentifier="category" 
          />
           {expensesForMainCategoryAndDescendants.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-4">No expenses found for this category (including sub-categories) for the selected period.</p>
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
            <DialogDescription>Update the details of your expense.</DialogDescription>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              categories={allUserCategories}
              paymentMethods={userPaymentMethods}
              currencies={userCurrencies}
              onSubmit={handleUpdateExpenseSubmit}
              initialData={editingExpense}
            />
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
