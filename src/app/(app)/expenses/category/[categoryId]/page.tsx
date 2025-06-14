
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency, ExchangeRate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns';
import { convertToBaseCurrency, BASE_CURRENCY_ID, getCurrencySymbol } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { getAllDescendantCategoryIds, getCategoryPath, type CategoryPathPart } from "@/lib/category-utils";
import { getExpensesCol, updateExpenseDoc, deleteExpenseDoc } from "@/lib/services/expense-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import { getExchangeRatesCol } from "@/lib/services/exchange-rate-service";


type FilterPeriod = "all" | "year" | "month" | "week";

const sumAmountsInBase = (expensesToSum: Expense[], rates: ExchangeRate[]): number => {
  if (!rates || rates.length === 0) {
    console.warn("Exchange rates not available for summing amounts in base currency.");
    return expensesToSum.reduce((acc, expense) => acc + expense.amount, 0);
  }
  return expensesToSum.reduce((acc, expense) => {
    return acc + convertToBaseCurrency(expense.amount, expense.currencyId, rates);
  }, 0);
};

export default function CategoryExpensesPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryIdFromUrl = params.categoryId as string;
  const fromQueryParam = searchParams.get("from");

  const [allExpensesForCategoryAndDescendants, setAllExpensesForCategoryAndDescendants] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | undefined>(undefined);
  const [categoryPath, setCategoryPath] = useState<CategoryPathPart[]>([]);

  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [userPaymentMethods, setUserPaymentMethods] = useState<PaymentMethod[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [userExchangeRates, setUserExchangeRates] = useState<ExchangeRate[]>([]);

  const [activeTab, setActiveTab] = useState<FilterPeriod>("all");
  const [baseCurrencySymbol, setBaseCurrencySymbolState] = useState<string>('$');
  const [comparisonText, setComparisonText] = useState<string | null>(null);
  const [comparisonTextColor, setComparisonTextColor] = useState<string>("text-muted-foreground");

  const [backButtonText, setBackButtonText] = useState("Back");
  const [backButtonAction, setBackButtonAction] = useState<() => void>(() => () => {});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

   useEffect(() => {
    let newBackButtonText = "Back";
    const navigateBack = () => {
      if (fromQueryParam === "dashboard") { newBackButtonText = "Back to Dashboard"; router.push("/dashboard");}
      else if (fromQueryParam === "budgets") { newBackButtonText = "Back to Budgets"; router.push("/budgets");}
      else if (fromQueryParam === "expenses") { newBackButtonText = "Back to Expenses"; router.push("/expenses");}
      else if (fromQueryParam === "search") { newBackButtonText = "Back to Search Results"; router.push("/expenses/search");}
      else if (fromQueryParam === "categories") { newBackButtonText = "Back to Categories"; router.push("/categories");}
      else if (fromQueryParam === "overview") { newBackButtonText = "Back to Overview"; router.back(); }
      else if (fromQueryParam === "payment-method") { newBackButtonText = "Back to Payment Method View"; router.back(); }
      else { router.back(); }
    };
    setBackButtonText(newBackButtonText);
    setBackButtonAction(() => navigateBack);
  }, [fromQueryParam, router]);


  const fetchPageData = useCallback(async () => {
    if (!user || !categoryIdFromUrl) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedUserCategories,
        fetchedUserExpenses,
        fetchedUserPaymentMethods,
        fetchedUserCurrencies,
        fetchedUserExchangeRates
      ] = await Promise.all([
        getCategoriesCol(user.uid),
        getExpensesCol(user.uid),
        getPaymentMethodsCol(user.uid),
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid)
      ]);

      setUserCategories(fetchedUserCategories);
      setUserPaymentMethods(fetchedUserPaymentMethods);
      setUserCurrencies(fetchedUserCurrencies);
      setUserExchangeRates(fetchedUserExchangeRates);
      setBaseCurrencySymbolState(getCurrencySymbol(BASE_CURRENCY_ID, fetchedUserCurrencies));

      const category = fetchedUserCategories.find(cat => cat.id === categoryIdFromUrl);
      setCurrentCategory(category);
      if (category) {
          setCategoryPath(getCategoryPath(category.id, fetchedUserCategories));
      }

      const descendantIds = getAllDescendantCategoryIds(categoryIdFromUrl, fetchedUserCategories);
      const categoryIdsToConsider = Array.from(new Set([categoryIdFromUrl, ...descendantIds]));
      const expensesForCategory = fetchedUserExpenses
        .filter(exp => categoryIdsToConsider.includes(exp.categoryId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllExpensesForCategoryAndDescendants(expensesForCategory);

    } catch (error) {
        console.error("Error fetching category expenses data:", error);
        toast({title: "Error", description: "Could not load data for this category.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [user, categoryIdFromUrl, toast]);

  useEffect(() => {
    if(user && categoryIdFromUrl){
      fetchPageData();
    } else {
      setIsLoading(false);
    }
  }, [fetchPageData, user, categoryIdFromUrl]);


  useEffect(() => {
    let newFilteredExpenses = [...allExpensesForCategoryAndDescendants];
    const now = new Date();
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;
    let previousPeriodStart: Date | null = null;
    let previousPeriodEnd: Date | null = null;

    if (activeTab === "week") {
      currentPeriodStart = startOfWeek(now, { weekStartsOn: 1 });
      currentPeriodEnd = endOfWeek(now, { weekStartsOn: 1 });
      previousPeriodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      previousPeriodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    } else if (activeTab === "month") {
      currentPeriodStart = startOfMonth(now);
      currentPeriodEnd = endOfMonth(now);
      previousPeriodStart = startOfMonth(subMonths(now, 1));
      previousPeriodEnd = endOfMonth(subMonths(now, 1));
    } else if (activeTab === "year") {
      currentPeriodStart = startOfYear(now);
      currentPeriodEnd = endOfYear(now);
      previousPeriodStart = startOfYear(subYears(now, 1));
      previousPeriodEnd = endOfYear(subYears(now, 1));
    }

    if(currentPeriodStart && currentPeriodEnd) {
        newFilteredExpenses = allExpensesForCategoryAndDescendants.filter(exp =>
            isValid(new Date(exp.date)) && isWithinInterval(new Date(exp.date), { start: currentPeriodStart!, end: currentPeriodEnd! })
        );
    }
    setFilteredExpenses(newFilteredExpenses);

    if (activeTab === "all" || !currentPeriodStart || !currentPeriodEnd || !previousPeriodStart || !previousPeriodEnd || userExchangeRates.length === 0) {
      setComparisonText(null);
      return;
    }

    const currentPeriodExpenses = allExpensesForCategoryAndDescendants.filter(exp =>
      isValid(new Date(exp.date)) && isWithinInterval(new Date(exp.date), { start: currentPeriodStart!, end: currentPeriodEnd! })
    );
    const previousPeriodExpenses = allExpensesForCategoryAndDescendants.filter(exp =>
      isValid(new Date(exp.date)) && isWithinInterval(new Date(exp.date), { start: previousPeriodStart!, end: previousPeriodEnd! })
    );

    const currentTotalInBase = sumAmountsInBase(currentPeriodExpenses, userExchangeRates);
    const previousTotalInBase = sumAmountsInBase(previousPeriodExpenses, userExchangeRates);

    let message: string | null = null;
    let textColor = "text-muted-foreground";
    const periodName = activeTab;

    if (previousTotalInBase > 0) {
      const percentageChange = ((currentTotalInBase - previousTotalInBase) / previousTotalInBase) * 100;
      const trendWord = percentageChange > 0 ? "more" : percentageChange < 0 ? "less" : "the same amount as";

      textColor = percentageChange > 0 ? "text-destructive" :
                  percentageChange < 0 ? "text-green-600 dark:text-green-500" :
                  "text-sky-600 dark:text-sky-500";

      if (percentageChange !== 0) {
        message = `You spent ${baseCurrencySymbol}${currentTotalInBase.toFixed(2)} this ${periodName}. That's ${Math.abs(percentageChange).toFixed(0)}% ${trendWord} than the previous ${periodName} (${baseCurrencySymbol}${previousTotalInBase.toFixed(2)}).`;
      } else {
        message = `You spent ${baseCurrencySymbol}${currentTotalInBase.toFixed(2)} this ${periodName}, which is the same as the previous ${periodName}.`;
         textColor = "text-foreground";
      }
    } else if (currentTotalInBase > 0) {
      message = `You spent ${baseCurrencySymbol}${currentTotalInBase.toFixed(2)} this ${periodName}. No spending recorded in the previous ${periodName}.`;
      textColor = "text-sky-600 dark:text-sky-500";
    } else {
      message = `No spending recorded for this category (including sub-categories) in this ${periodName} or the previous one.`;
      textColor = "text-muted-foreground";
    }
    setComparisonText(message);
    setComparisonTextColor(textColor);

  }, [allExpensesForCategoryAndDescendants, activeTab, userExchangeRates, baseCurrencySymbol]);

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


  const getTabDescription = () => {
    const now = new Date();
    let baseDescription = `Showing expenses recorded for this category and its sub-categories`;
    switch(activeTab) {
      case "week":
        return `${baseDescription} for the current week (${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(now, { weekStartsOn: 1 }), 'MMM d, yyyy')}).`;
      case "month":
        return `${baseDescription} for the current month (${format(now, 'MMMM yyyy')}).`;
      case "year":
        return `${baseDescription} for the current year (${format(now, 'yyyy')}).`;
      case "all":
      default:
        return `${baseDescription} across all time.`;
    }
  }

  const renderPageTitle = () => {
    if (!currentCategory) return "Category Expenses";
    return (
      <>
        Expenses for&nbsp;
        {categoryPath.map((part, index) => (
          <React.Fragment key={part.id}>
            {index < categoryPath.length - 1 ? (
              <Link
                href={`/expenses/category/${part.id}${fromQueryParam ? `?from=${fromQueryParam}` : ''}`}
                className="hover:underline text-primary hover:text-primary/80"
              >
                {part.name}
              </Link>
            ) : (
              <span className="font-semibold">{part.name}</span>
            )}
            {index < categoryPath.length - 1 && <span className="mx-1 text-muted-foreground">&gt;</span>}
          </React.Fragment>
        ))}
      </>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading expenses for category...</p></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <Button variant="outline" onClick={backButtonAction} className="mb-4 shadow-sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> {backButtonText}
        </Button>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">{renderPageTitle()}</CardTitle>
            <CardDescription>{getTabDescription()}</CardDescription>
             {comparisonText && (
              <p className={cn("text-sm mt-2 font-medium", comparisonTextColor)}>
                {comparisonText}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FilterPeriod)} className="w-full">
              <TabsList className="grid w-full h-auto grid-cols-1 gap-1 sm:flex sm:h-10 sm:w-auto mb-4">
                <TabsTrigger value="all">All Time</TabsTrigger>
                <TabsTrigger value="year">This Year</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
              </TabsList>

              {(["all", "year", "month", "week"] as FilterPeriod[]).map((period) => (
                <TabsContent key={period} value={period}>
                  <ExpenseList
                    expenses={filteredExpenses}
                    categories={userCategories}
                    paymentMethods={userPaymentMethods}
                    currencies={userCurrencies}
                    onEdit={handleEdit}
                    onDelete={handleDeleteExpenseClick}
                    sourcePageIdentifier="category"
                  />
                </TabsContent>
              ))}
            </Tabs>
             {filteredExpenses.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-4">No expenses found for this category (including sub-categories) in the selected period.</p>
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
