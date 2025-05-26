
"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, ListChecks, PlusCircle, Target, Tags, Scale, TrendingDown, PiggyBank, AlertTriangle } from "lucide-react";
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
import { getMonth, getYear, isSameMonth, isSameYear, format } from 'date-fns';

import type { Income, Expense, Currency, ExchangeRate, Category, SavingGoal, Budget as BudgetType } from "@/lib/types";
import { 
    initialIncomesData, 
    initialExpensesData, 
    initialCategoriesData, 
    initialCurrenciesData, 
    initialExchangeRatesData,
    initialSavingGoalsData,
    initialBudgetGoalsData
} from "@/lib/mock-data";
import { convertToBaseCurrency, BASE_CURRENCY_ID, getCurrencySymbol } from "@/lib/currency-utils";
import { getAllDescendantCategoryIds } from "@/lib/category-utils";

const calculateSpentAmountForBudget = (
  budgetGoal: Omit<BudgetType, 'spentAmount'>,
  allExpenses: Expense[],
  allCategories: Category[],
  allCurrencies: Currency[], 
  allExchangeRates: ExchangeRate[]
): number => {
  const budgetCategory = allCategories.find(c => c.id === budgetGoal.categoryId);
  if (!budgetCategory) {
    return 0;
  }
  const categoryIdsToConsider = [budgetGoal.categoryId, ...getAllDescendantCategoryIds(budgetGoal.categoryId, allCategories)];
  const uniqueCategoryIdsToConsider = Array.from(new Set(categoryIdsToConsider));

  return allExpenses
    .filter(exp => uniqueCategoryIdsToConsider.includes(exp.categoryId))
    .reduce((sum, exp) => sum + convertToBaseCurrency(exp.amount, exp.currencyId, allExchangeRates), 0); // Removed allCategories
};


export default function DashboardPage() {
  const [totalSpentThisMonthValue, setTotalSpentThisMonthValue] = useState<number>(0);
  const [budgetStatusValue, setBudgetStatusValue] = useState<string>("Checking...");
  const [budgetStatusDescription, setBudgetStatusDescription] = useState<string>("Analyzing budget performance.");
  const [budgetStatusIcon, setBudgetStatusIcon] = useState<React.ElementType>(TrendingUp);
  const [budgetStatusIconColor, setBudgetStatusIconColor] = useState<string | undefined>(undefined);
  
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpensesAllTime, setTotalExpensesAllTimeState] = useState<number>(0);
  const [netBalance, setNetBalance] = useState<number>(0);
  const [baseCurrencySymbol, setBaseCurrencySymbol] = useState<string>("$");
  
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]); 
  const [currencies, setCurrenciesState] = useState<Currency[]>([]); 
  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRate[]>([]); 
  const [incomes, setIncomesState] = useState<Income[]>([]); 
  const [savingGoals, setSavingGoalsState] = useState<SavingGoal[]>([]); 
  
  const [currentMonthLink, setCurrentMonthLink] = useState<string>("#");

  useEffect(() => {
    setCategoriesState([...initialCategoriesData]);
    setExpensesState([...initialExpensesData]);
    setCurrenciesState([...initialCurrenciesData]);
    setExchangeRatesState([...initialExchangeRatesData]);
    setIncomesState([...initialIncomesData]);

    const sortedSavingGoals = [...initialSavingGoalsData].sort((a, b) => {
      const progressA = a.targetAmount > 0 ? (a.currentAmount / a.targetAmount) : 0;
      const progressB = b.targetAmount > 0 ? (b.currentAmount / b.targetAmount) : 0;
      return progressB - progressA; 
    });
    setSavingGoalsState(sortedSavingGoals);
    
    const calculatedTotalIncome = initialIncomesData.reduce((sum, income) => {
      return sum + convertToBaseCurrency(income.amount, income.currencyId, initialExchangeRatesData); // Removed initialCategoriesData
    }, 0);
    const calculatedTotalExpenses = initialExpensesData.reduce((sum, expense) => {
      return sum + convertToBaseCurrency(expense.amount, expense.currencyId, initialExchangeRatesData); // Removed initialCategoriesData
    }, 0);

    setTotalIncome(calculatedTotalIncome);
    setTotalExpensesAllTimeState(calculatedTotalExpenses);
    setNetBalance(calculatedTotalIncome - calculatedTotalExpenses);
    setBaseCurrencySymbol(getCurrencySymbol(BASE_CURRENCY_ID, initialCurrenciesData));

    const now = new Date();
    const currentYear = getYear(now);
    const currentMonthIndex = getMonth(now); 
    setCurrentMonthLink(`/expenses/overview/${currentYear}/${currentMonthIndex + 1}`);

    const spentThisMonth = initialExpensesData
      .filter(exp => isSameMonth(new Date(exp.date), now) && isSameYear(new Date(exp.date), now))
      .reduce((sum, exp) => sum + convertToBaseCurrency(exp.amount, exp.currencyId, initialExchangeRatesData), 0); // Removed initialCategoriesData
    setTotalSpentThisMonthValue(spentThisMonth);

    let isOverBudget = false;
    let budgetsWithinLimit = 0;
    if (initialBudgetGoalsData.length > 0) {
        initialBudgetGoalsData.forEach(goal => {
            const spent = calculateSpentAmountForBudget(goal, initialExpensesData, initialCategoriesData, initialCurrenciesData, initialExchangeRatesData);
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
        } else if (budgetsWithinLimit === initialBudgetGoalsData.length) {
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
    
  }, [
      initialExpensesData, 
      initialIncomesData, 
      initialBudgetGoalsData, 
      initialCategoriesData, 
      initialCurrenciesData, 
      initialExchangeRatesData, 
      initialSavingGoalsData
    ]); 


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
          value={`${expenses.length} Total`} 
          icon={ListChecks}
          description="View all transactions"
          href="/expenses"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SpendingOverviewChart 
            expenses={expenses} 
            currencies={currencies} 
            exchangeRates={exchangeRates} 
        />
        <CategorySpendingChart 
          categories={categories} 
          expenses={expenses}     
          currencies={currencies} 
          exchangeRates={exchangeRates} 
        /> 
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scale className="mr-3 h-6 w-6 text-primary" />
              All-Time Financial Overview
            </CardTitle>
            <CardDescription>
              Your total income, expenses, and net balance (all figures in {baseCurrencySymbol}). Click on income or expenses to see details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/income" className="block rounded-md transition-colors group">
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md shadow group-hover:bg-secondary/50 cursor-pointer">
                <div className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-green-600 dark:text-green-500" />
                  <span className="font-medium">Total Income:</span>
                </div>
                <span className="font-semibold text-lg text-green-600 dark:text-green-500">
                  {baseCurrencySymbol}{totalIncome.toFixed(2)}
                </span>
              </div>
            </Link>
            <Link href="/expenses" className="block rounded-md transition-colors group">
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md shadow group-hover:bg-secondary/50 cursor-pointer">
                <div className="flex items-center">
                  <TrendingDown className="mr-2 h-5 w-5 text-red-600 dark:text-red-500" />
                  <span className="font-medium">Total Expenses:</span>
                </div>
                <span className="font-semibold text-lg text-red-600 dark:text-red-500">
                  {baseCurrencySymbol}{totalExpensesAllTime.toFixed(2)}
                </span>
              </div>
            </Link>
            <Separator />
            <div className="flex justify-between items-center p-4 bg-card rounded-md border shadow-inner">
              <div className="flex items-center">
                <Scale className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-500" />
                <span className="font-medium text-lg">Net Balance:</span>
              </div>
              <span className={cn(
                "font-bold text-xl",
                netBalance >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              )}>
                {baseCurrencySymbol}{netBalance.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

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
            {savingGoals.length > 0 ? ( 
                savingGoals.slice(0,3).map(goal => {
                    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    const IconComponent = goal.icon || PiggyBank;
                    return (
                        <div key={goal.id} className="space-y-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium flex items-center"><IconComponent className="w-4 h-4 mr-2 text-muted-foreground"/>{goal.name}</span>
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
      </div>
      
       <div className="grid gap-6 md:grid-cols-2">
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
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle>Financial Tip</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-4">
            <Image 
                src="https://placehold.co/300x200.png" 
                alt="Financial Tip Illustration" 
                width={300} 
                height={200} 
                className="rounded-md object-cover"
                data-ai-hint="finance piggybank" 
            />
            <div>
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
