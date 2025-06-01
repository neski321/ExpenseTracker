
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, ListChecks, PlusCircle, Target, Tags, Scale, TrendingDown, PiggyBank, AlertTriangle, Coins } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { SpendingOverviewChart } from "@/components/charts/spending-overview-chart";
import { CategorySpendingChart } from "@/components/charts/category-spending-chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getMonth, getYear, isSameMonth, isSameYear, format, startOfWeek, endOfWeek, isWithinInterval, isValid } from 'date-fns';
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import type { Income, Expense, Currency, ExchangeRate, Category, SavingGoal, Budget as BudgetType } from "@/lib/types";
// Import Firestore services
import { getExpensesCol } from "@/lib/services/expense-service";
import { getIncomesCol } from "@/lib/services/income-service";
import { getCategoriesCol } from "@/lib/services/category-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import { getExchangeRatesCol } from "@/lib/services/exchange-rate-service";
import { getBudgetGoalsCol } from "@/lib/services/budget-goal-service";
import { getSavingGoalsCol } from "@/lib/services/saving-goal-service";

import { convertToBaseCurrency, BASE_CURRENCY_ID, getCurrencySymbol } from "@/lib/currency-utils";
import { getAllDescendantCategoryIds } from "@/lib/category-utils";
import { getLucideIcon } from "@/lib/icon-utils";

type BudgetGoalStorage = Omit<BudgetType, "spentAmount" | "name" | "id"> & { id: string };


const calculateSpentAmountForBudget = (
  budgetGoal: BudgetGoalStorage,
  allExpenses: Expense[],
  allUserCategories: Category[],
  allExchangeRates: ExchangeRate[]
): number => {
  const budgetCategory = allUserCategories.find(c => c.id === budgetGoal.categoryId);
  if (!budgetCategory) {
    return 0;
  }
  const categoryIdsToConsider = [budgetGoal.categoryId, ...getAllDescendantCategoryIds(budgetGoal.categoryId, allUserCategories)];
  const uniqueCategoryIdsToConsider = Array.from(new Set(categoryIdsToConsider));

  return allExpenses
    .filter(exp => uniqueCategoryIdsToConsider.includes(exp.categoryId))
    .reduce((sum, exp) => sum + convertToBaseCurrency(exp.amount, exp.currencyId, allExchangeRates), 0);
};


export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [totalSpentThisMonthValue, setTotalSpentThisMonthValue] = useState<number>(0);
  const [budgetStatusValue, setBudgetStatusValue] = useState<string>("Checking...");
  const [budgetStatusDescription, setBudgetStatusDescription] = useState<string>("Analyzing budget performance.");
  const [budgetStatusIcon, setBudgetStatusIcon] = useState<React.ElementType>(TrendingUp);
  const [budgetStatusIconColor, setBudgetStatusIconColor] = useState<string | undefined>(undefined);

  const [baseCurrencySymbol, setBaseCurrencySymbol] = useState<string>("$");
  const [transactionsThisWeekCount, setTransactionsThisWeekCount] = useState<number>(0);

  // Firestore-backed data states
  const [userCategoriesState, setUserCategoriesState] = useState<Category[]>([]);
  const [userExpensesState, setUserExpensesState] = useState<Expense[]>([]);
  const [userIncomesState, setUserIncomesState] = useState<Income[]>([]); // Still needed for potential future dashboard elements
  const [userCurrenciesState, setUserCurrenciesState] = useState<Currency[]>([]);
  const [userExchangeRatesState, setUserExchangeRatesState] = useState<ExchangeRate[]>([]);
  const [userBudgetGoalsState, setUserBudgetGoalsState] = useState<BudgetGoalStorage[]>([]);
  const [userSavingGoalsState, setUserSavingGoalsState] = useState<SavingGoal[]>([]);

  const [currentMonthLink, setCurrentMonthLink] = useState<string>("#");

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedExpenses,
        fetchedIncomes, // Keep fetching incomes if other dashboard parts might use it
        fetchedCategories,
        fetchedCurrencies,
        fetchedExchangeRates,
        fetchedBudgetGoals,
        fetchedSavingGoals,
      ] = await Promise.all([
        getExpensesCol(user.uid),
        getIncomesCol(user.uid),
        getCategoriesCol(user.uid),
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid),
        getBudgetGoalsCol(user.uid),
        getSavingGoalsCol(user.uid),
      ]);

      setUserExpensesState(fetchedExpenses);
      setUserIncomesState(fetchedIncomes); // Set for potential use
      setUserCategoriesState(fetchedCategories);
      setUserCurrenciesState(fetchedCurrencies);
      setUserExchangeRatesState(fetchedExchangeRates);
      setUserBudgetGoalsState(fetchedBudgetGoals);

      const sortedSavingGoals = [...fetchedSavingGoals].sort((a, b) => {
        const progressA = a.targetAmount > 0 ? (a.currentAmount / a.targetAmount) : 0;
        const progressB = b.targetAmount > 0 ? (b.currentAmount / b.targetAmount) : 0;
        return progressB - progressA;
      });
      setUserSavingGoalsState(sortedSavingGoals);
      setBaseCurrencySymbol(getCurrencySymbol(BASE_CURRENCY_ID, fetchedCurrencies));

      const now = new Date();
      const currentYear = getYear(now);
      const currentMonthIndex = getMonth(now);
      setCurrentMonthLink(`/expenses/overview/${currentYear}/${currentMonthIndex + 1}`);

      const spentThisMonth = fetchedExpenses
        .filter(exp => isSameMonth(new Date(exp.date), now) && isSameYear(new Date(exp.date), now))
        .reduce((sum, exp) => sum + convertToBaseCurrency(exp.amount, exp.currencyId, fetchedExchangeRates), 0);
      setTotalSpentThisMonthValue(spentThisMonth);
      
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); 
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });
      const expensesThisWeek = fetchedExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return isValid(expDate) && isWithinInterval(expDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
      });
      setTransactionsThisWeekCount(expensesThisWeek.length);

      let isOverBudget = false;
      let budgetsWithinLimit = 0;
      if (fetchedBudgetGoals.length > 0) {
          fetchedBudgetGoals.forEach(goal => {
              const spent = calculateSpentAmountForBudget(goal, fetchedExpenses, fetchedCategories, fetchedExchangeRates);
              if (spent > goal.goalAmount) {
                isOverBudget = true;
              } else {
                budgetsWithinLimit++;
              }
          });

          if (isOverBudget) {
              setBudgetStatusValue("Action Needed");
              setBudgetStatusDescription("One or more budgets are overspent. Click to review.");
              setBudgetStatusIcon(AlertTriangle);
              setBudgetStatusIconColor("text-destructive");
          } else if (budgetsWithinLimit === fetchedBudgetGoals.length) {
              setBudgetStatusValue("On Track");
              setBudgetStatusDescription("All budgets are within limits. Click to review.");
              setBudgetStatusIcon(TrendingUp);
              setBudgetStatusIconColor("text-green-500 dark:text-green-400");
          } else {
              setBudgetStatusValue("Monitoring");
              setBudgetStatusDescription("Review your budget progress. Click to review.");
              setBudgetStatusIcon(TrendingUp);
              setBudgetStatusIconColor(undefined);
          }
      } else {
          setBudgetStatusValue("No Budgets Set");
          setBudgetStatusDescription("Set budgets to track spending. Click to set budgets.");
          setBudgetStatusIcon(Target);
          setBudgetStatusIconColor(undefined);
      }

    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast({ title: "Error loading dashboard", description: error.message || "Could not load dashboard data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if(user) {
      fetchDashboardData();
    } else {
      setIsLoading(false); 
    }
  }, [user, fetchDashboardData]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))] bg-background p-4">
        <Coins className="w-16 h-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Spent (This Month)"
          value={`${baseCurrencySymbol}${totalSpentThisMonthValue.toFixed(2)}`}
          icon={DollarSign}
          description={`View ${format(new Date(), 'MMMM yyyy')} expenses`}
          href={currentMonthLink}
        />
        <StatCard
          title="Budget Status"
          value={budgetStatusValue}
          icon={budgetStatusIcon}
          description={budgetStatusDescription}
          iconClassName={budgetStatusIconColor}
          href="/budgets"
        />
        <StatCard
          title="Recent Transactions"
          value={`${transactionsThisWeekCount} This Week`}
          icon={ListChecks}
          description="Transactions this week"
          href="/expenses"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SpendingOverviewChart
            expenses={userExpensesState}
            currencies={userCurrenciesState}
            exchangeRates={userExchangeRatesState}
        />
        <CategorySpendingChart
          categories={userCategoriesState}
          expenses={userExpensesState}
          currencies={userCurrenciesState}
          exchangeRates={userExchangeRatesState}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
                <PiggyBank className="mr-3 h-6 w-6 text-primary" />
                Savings Goals At-a-Glance
            </CardTitle>
            <CardDescription>
                Track your progress towards your financial objectives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userSavingGoalsState.length > 0 ? (
                userSavingGoalsState.slice(0,3).map(goal => {
                    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    const IconToRender = getLucideIcon(goal.iconName) || PiggyBank;
                    return (
                        <div key={goal.id} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium flex items-center">
                                  <IconToRender className="w-4 h-4 mr-2 text-muted-foreground"/>
                                  {goal.name}
                                </span>
                                <span className="text-muted-foreground">{baseCurrencySymbol}{goal.currentAmount.toFixed(2)} / {baseCurrencySymbol}{goal.targetAmount.toFixed(2)}</span>
                            </div>
                            <Progress value={progress} className="h-2.5" />
                        </div>
                    );
                })
            ) : (
                <p className="text-muted-foreground text-center py-4">No savings goals set yet.</p>
            )}
            <Button asChild variant="outline" className="w-full justify-center mt-4">
                <Link href="/savings-goals">
                    View All Goals
                </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your finances efficiently.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/expenses">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/budgets">
                <Target className="mr-2 h-4 w-4" /> Set Budget Goal
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/categories">
                <Tags className="mr-2 h-4 w-4" /> Manage Categories
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle>Financial Tip</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-4">
            <Image
                src="https://www.softwaresuggest.com/blog/wp-content/uploads/2024/03/10-money-management-tips-to-improve-your-finances.jpg"
                alt="Financial Tip Illustration"
                width={300}
                height={200}
                className="rounded-md object-cover w-full md:w-1/3 max-w-[300px] aspect-[3/2]"
                data-ai-hint="finance money management"
            />
            <div className="md:pl-4">
                <p className="text-lg font-semibold mb-2">Automate Your Savings</p>
                <p className="text-muted-foreground">
                Set up automatic transfers to your savings account each payday. Even small, consistent contributions can add up significantly over time. This "pay yourself first" strategy ensures you're always working towards your financial goals.
                </p>
            </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
