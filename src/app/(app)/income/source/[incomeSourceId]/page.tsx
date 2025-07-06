"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IncomeList } from "@/components/income/income-list";
import type { Income, IncomeSource, Currency } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign } from "lucide-react";
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
import { IncomeForm } from "@/components/income/income-form";
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
import { getIncomesCol, updateIncomeDoc, deleteIncomeDoc } from "@/lib/services/income-service";
import { getIncomeSourcesCol } from "@/lib/services/income-source-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";

type FilterPeriod = "all" | "year" | "month" | "week";

export default function IncomeSourceIncomesPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const incomeSourceIdFromUrl = params.incomeSourceId as string;
  const fromQueryParam = searchParams.get("from");

  const [allIncomesForSource, setAllIncomesForSource] = useState<Income[]>([]);
  const [filteredIncomes, setFilteredIncomes] = useState<Income[]>([]);
  const [currentIncomeSource, setCurrentIncomeSource] = useState<IncomeSource | undefined>(undefined);

  const [userIncomeSources, setUserIncomeSources] = useState<IncomeSource[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);

  const [activeTab, setActiveTab] = useState<FilterPeriod>("all");
  const [baseCurrencySymbol, setBaseCurrencySymbolState] = useState<string>('$');
  const [comparisonText, setComparisonText] = useState<string | null>(null);
  const [comparisonTextColor, setComparisonTextColor] = useState<string>("text-muted-foreground");

  const [backButtonText, setBackButtonText] = useState("Back");
  const [backButtonAction, setBackButtonAction] = useState<() => void>(() => () => {});

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [incomeToDeleteId, setIncomeToDeleteId] = useState<string | null>(null);

  const sumAmountsInBase = (incomes: Income[], exchangeRates: any[]) => {
    return incomes.reduce((sum, income) => {
      return sum + convertToBaseCurrency(income.amount, income.currencyId, exchangeRates);
    }, 0);
  };

  const fetchPageData = useCallback(async () => {
    if (!user || !incomeSourceIdFromUrl) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        fetchedUserIncomes,
        fetchedUserIncomeSources,
        fetchedUserCurrencies
      ] = await Promise.all([
        getIncomesCol(user.uid),
        getIncomeSourcesCol(user.uid),
        getCurrenciesCol(user.uid)
      ]);

      setUserIncomeSources(fetchedUserIncomeSources);
      setUserCurrencies(fetchedUserCurrencies);
      setBaseCurrencySymbolState(getCurrencySymbol(BASE_CURRENCY_ID, fetchedUserCurrencies));

      const incomeSource = fetchedUserIncomeSources.find(src => src.id === incomeSourceIdFromUrl);
      setCurrentIncomeSource(incomeSource);

      const incomesForSource = fetchedUserIncomes
        .filter(inc => inc.incomeSourceId === incomeSourceIdFromUrl)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllIncomesForSource(incomesForSource);

      if (fromQueryParam === "dashboard") setBackButtonText("Back to Dashboard");
      else if (fromQueryParam === "income") setBackButtonText("Back to Income");
      else if (fromQueryParam === "income-sources") setBackButtonText("Back to Income Sources");
      else setBackButtonText("Back");

      setBackButtonAction(() => () => {
        if (fromQueryParam === "dashboard") router.push("/dashboard");
        else if (fromQueryParam === "income") router.push("/income");
        else if (fromQueryParam === "income-sources") router.push("/income-sources");
        else router.back();
      });

    } catch (error) {
      console.error("Error fetching income source incomes data:", error);
      toast({title: "Error", description: "Could not load data for this income source.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  }, [user, incomeSourceIdFromUrl, fromQueryParam, router, toast]);

  useEffect(() => {
    if(user && incomeSourceIdFromUrl){
      fetchPageData();
    } else {
      setIsLoading(false);
    }
  }, [fetchPageData, user, incomeSourceIdFromUrl]);

  useEffect(() => {
    let newFilteredIncomes = [...allIncomesForSource];
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
        newFilteredIncomes = allIncomesForSource.filter(inc =>
            isValid(new Date(inc.date)) && isWithinInterval(new Date(inc.date), { start: currentPeriodStart!, end: currentPeriodEnd! })
        );
    }
    setFilteredIncomes(newFilteredIncomes);

    // For now, we'll skip comparison text for income as it's less critical than expenses
    setComparisonText(null);
  }, [allIncomesForSource, activeTab]);

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const handleUpdateIncome = async (data: Omit<Income, "id">) => {
    if (!user || !editingIncome) return;
    try {
      await updateIncomeDoc(user.uid, editingIncome.id, data);
      toast({ title: "Income Updated", description: "Your income entry has been successfully updated." });
      fetchPageData();
      setEditingIncome(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Updating Income", description: error.message || "Could not update income.", variant: "destructive" });
    }
  };

  const handleDeleteIncomeClick = (incomeId: string) => {
    setIncomeToDeleteId(incomeId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDeleteIncome = async () => {
    if (!user || !incomeToDeleteId) return;
    try {
      await deleteIncomeDoc(user.uid, incomeToDeleteId);
      toast({ title: "Income Deleted", description: "The income entry has been removed successfully.", variant: "destructive" });
      fetchPageData();
    } catch (error: any) {
      toast({ title: "Error Deleting Income", description: error.message || "Could not delete income.", variant: "destructive" });
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setIncomeToDeleteId(null);
    }
  };

  const getTabDescription = () => {
    const now = new Date();
    let baseDescription = `Showing income recorded for ${currentIncomeSource?.name || 'this source'}`;
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
    if (!currentIncomeSource) return "Income Source";
    return `Income from ${currentIncomeSource.name}`;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading income for source...</p></div>;
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
              <DollarSign className="mr-3 h-6 w-6 text-primary" />
              {renderPageTitle()}
            </CardTitle>
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
                  <IncomeList
                    incomes={filteredIncomes}
                    incomeSources={userIncomeSources}
                    currencies={userCurrencies}
                    onEdit={handleEdit}
                    onDelete={handleDeleteIncomeClick}
                  />
                </TabsContent>
              ))}
            </Tabs>
            {filteredIncomes.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-center py-4">No income found for this source in the selected period.</p>
            )}
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) setEditingIncome(undefined);
        }}>
          <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Income</DialogTitle>
              <DialogDescription>
                Update the details of your income entry.
              </DialogDescription>
            </DialogHeader>
            {editingIncome && (
              <IncomeForm
                incomeSources={userIncomeSources}
                currencies={userCurrencies}
                onSubmit={handleUpdateIncome}
                initialData={editingIncome}
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
              This action cannot be undone. This will permanently delete this income entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIncomeToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteIncome}>
              Yes, delete income
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 