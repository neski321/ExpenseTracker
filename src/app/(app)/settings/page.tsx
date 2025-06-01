
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CurrencyList } from "@/components/settings/currency-list";
import { CurrencyForm } from "@/components/settings/currency-form";
import { ExchangeRateForm } from "@/components/settings/exchange-rate-form";
import { UpdateEmailForm } from "@/components/settings/update-email-form";
import type { Currency, ExchangeRate, Income, Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings as SettingsIcon, Trash2, UserCog, Edit, Scale, TrendingUp, TrendingDown, Coins, PiggyBank } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { BASE_CURRENCY_ID, getCurrencySymbol, convertToBaseCurrency } from "@/lib/currency-utils";
import {
  addCurrencyDoc,
  getCurrenciesCol,
  updateCurrencyDoc,
  deleteCurrencyDoc,
} from "@/lib/services/currency-service";
import {
  getExchangeRatesCol,
  setExchangeRateDoc,
  deleteExchangeRateDoc,
} from "@/lib/services/exchange-rate-service";
import { seedDefaultUserData } from "@/lib/services/user-service";
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getIncomesCol } from "@/lib/services/income-service";
import { getExpensesCol } from "@/lib/services/expense-service";


async function deleteAllDocsInUserCollection(userId: string, collectionName: string) {
  if (!userId) {
    console.error("User ID is undefined, cannot delete collection docs for:", collectionName);
    return;
  }
  const userColRef = collection(db, 'users', userId, collectionName);
  const snapshot = await getDocs(userColRef);
  if (snapshot.empty) {
    console.log(`No documents to delete in ${collectionName} for user ${userId}`);
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnapshot => {
    batch.delete(docSnapshot.ref);
  });
  await batch.commit();
  console.log(`All documents deleted from ${collectionName} for user ${userId}`);
}


export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isCurrencyFormOpen, setIsCurrencyFormOpen] = useState(false);
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | undefined>(undefined);
  const [currencyForRateEdit, setCurrencyForRateEdit] = useState<Currency | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateEmailForm, setShowUpdateEmailForm] = useState(false);

  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpensesAllTime, setTotalExpensesAllTime] = useState<number>(0);
  const [netBalance, setNetBalance] = useState<number>(0);
  const [baseCurrencySymbolToShow, setBaseCurrencySymbolToShow] = useState<string>('$');


  const [isClearCategoriesDialogOpen, setIsClearCategoriesDialogOpen] = useState(false);
  const [isClearingCategories, setIsClearingCategories] = useState(false);
  const [isClearBudgetsDialogOpen, setIsClearBudgetsDialogOpen] = useState(false);
  const [isClearingBudgets, setIsClearingBudgets] = useState(false);
  const [isClearExpensesDialogOpen, setIsClearExpensesDialogOpen] = useState(false);
  const [isClearingExpenses, setIsClearingExpenses] = useState(false);
  const [isClearIncomesDialogOpen, setIsClearIncomesDialogOpen] = useState(false);
  const [isClearingIncomes, setIsClearingIncomes] = useState(false);
  const [isClearSavingsDialogOpen, setIsClearSavingsDialogOpen] = useState(false);
  const [isClearingSavings, setIsClearingSavings] = useState(false);


  const { toast } = useToast();

  const fetchSettingsData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [
        userCurrencies, 
        userExchangeRates,
        userIncomes,
        userExpenses
      ] = await Promise.all([
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid),
        getIncomesCol(user.uid),
        getExpensesCol(user.uid),
      ]);
      setCurrencies(userCurrencies);
      setExchangeRates(userExchangeRates);
      setBaseCurrencySymbolToShow(getCurrencySymbol(BASE_CURRENCY_ID, userCurrencies));

      const calculatedTotalIncome = userIncomes.reduce((sum, income) => {
        return sum + convertToBaseCurrency(income.amount, income.currencyId, userExchangeRates);
      }, 0);
      const calculatedTotalExpenses = userExpenses.reduce((sum, expense) => {
        return sum + convertToBaseCurrency(expense.amount, expense.currencyId, userExchangeRates);
      }, 0);

      setTotalIncome(calculatedTotalIncome);
      setTotalExpensesAllTime(calculatedTotalExpenses);
      setNetBalance(calculatedTotalIncome - calculatedTotalExpenses);

    } catch (error: any) {
      console.error("Failed to load settings data:", error);
      toast({ title: "Error", description: error.message || "Could not load settings data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchSettingsData();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchSettingsData]);

  const handleAddCurrency = async (data: Omit<Currency, "id">) => {
    if (!user) return;
    try {
      const newCurrency = await addCurrencyDoc(user.uid, data as Currency); // Cast as Currency for potential id from seed
      if (newCurrency.id !== BASE_CURRENCY_ID) {
        const existingRate = exchangeRates.find(er => er.currencyId === newCurrency.id);
        if(!existingRate) {
           await setExchangeRateDoc(user.uid, newCurrency.id, 1.0);
        }
      }
      toast({ title: "Currency Added", description: `${data.name} (${data.code}) has been added.` });
      fetchSettingsData();
      setIsCurrencyFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Adding Currency", description: error.message || "Could not add currency.", variant: "destructive" });
    }
  };

  const handleUpdateCurrency = async (data: Omit<Currency, "id">) => {
    if (!user || !editingCurrency) return;
    try {
      await updateCurrencyDoc(user.uid, editingCurrency.id, data);
      toast({ title: "Currency Updated", description: `${data.name} (${data.code}) has been updated.` });
      fetchSettingsData();
      setEditingCurrency(undefined);
      setIsCurrencyFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Updating Currency", description: error.message || "Could not update currency.", variant: "destructive" });
    }
  };

  const handleDeleteCurrency = async (currencyId: string) => {
    if (!user) return;
    try {
      await deleteCurrencyDoc(user.uid, currencyId);
      await deleteExchangeRateDoc(user.uid, currencyId);
      toast({ title: "Currency Deleted", variant: "destructive", description: "Currency and its exchange rate removed." });
      fetchSettingsData();
    } catch (error: any) {
      toast({ title: "Cannot Delete Currency", description: error.message || "Could not delete currency.", variant: "destructive" });
    }
  };

  const handleOpenEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setIsCurrencyFormOpen(true);
  };

  const handleOpenRateEdit = (currency: Currency) => {
    setCurrencyForRateEdit(currency);
    setIsRateFormOpen(true);
  };

  const handleSetExchangeRate = async (currencyId: string, rate: number) => {
    if (!user) return;
    try {
      await setExchangeRateDoc(user.uid, currencyId, rate);
      const currency = currencies.find(c => c.id === currencyId);
      toast({ title: "Exchange Rate Set", description: `Rate for ${currency?.code} updated to ${rate}.` });
      fetchSettingsData();
      setIsRateFormOpen(false);
      setCurrencyForRateEdit(undefined);
    } catch (error: any) {
      toast({ title: "Error Setting Rate", description: error.message || "Could not set exchange rate.", variant: "destructive" });
    }
  };

  const handleConfirmClearData = async (
    collectionName: string,
    setDialogState: React.Dispatch<React.SetStateAction<boolean>>,
    setClearingState: React.Dispatch<React.SetStateAction<boolean>>,
    itemDisplayName: string,
    reSeedDefaults: boolean
  ) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      setDialogState(false);
      return;
    }
    setClearingState(true);
    toast({ title: `Clearing ${itemDisplayName}...`, description: "Please wait. This may take a moment." });

    try {
      await deleteAllDocsInUserCollection(user.uid, collectionName);
      if (reSeedDefaults) {
        await seedDefaultUserData(user.uid); 
        toast({
          title: `${itemDisplayName} Cleared & Defaults Re-seeded!`,
          description: `All your ${itemDisplayName.toLowerCase()} have been cleared, and default settings for the app have been restored.`,
          duration: 7000,
        });
      } else {
         toast({
          title: `${itemDisplayName} Cleared!`,
          description: `All your ${itemDisplayName.toLowerCase()} have been cleared.`,
          duration: 7000,
        });
      }
      fetchSettingsData(); // Re-fetch all settings page data
    } catch (error: any) {
      console.error(`Error clearing ${itemDisplayName.toLowerCase()}:`, error);
      toast({
        title: `Error Clearing ${itemDisplayName}`,
        description: error.message || `Could not clear ${itemDisplayName.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setDialogState(false);
      setClearingState(false);
    }
  };


  if (isLoading && !user) { 
    return <div className="flex justify-center items-center h-full"><p>Loading user data...</p></div>;
  }
  if (isLoading && user) { 
    return <div className="flex justify-center items-center h-full"><p>Loading settings...</p></div>;
  }


  const baseCurrency = currencies.find(c => c.id === BASE_CURRENCY_ID);

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <SettingsIcon className="mr-3 h-7 w-7 text-primary" />
            <div>
                <CardTitle className="text-2xl">Settings</CardTitle>
                <CardDescription>Manage application currencies, account, financial overview, and data.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <div className="flex items-center">
                <UserCog className="mr-3 h-6 w-6 text-primary" />
                <div>
                    <CardTitle className="text-xl">Account Settings</CardTitle>
                    <CardDescription>Manage your account details.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="mb-4">
                <h3 className="text-lg font-medium">Current Email</h3>
                <p className="text-sm text-muted-foreground">{user?.email || "Not available"}</p>
            </div>
            {!showUpdateEmailForm && (
              <Button onClick={() => setShowUpdateEmailForm(true)} className="w-full sm:w-auto shadow-md">
                <Edit className="mr-2 h-4 w-4" /> Update Email Address
              </Button>
            )}
            {showUpdateEmailForm && (
              <UpdateEmailForm />
            )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scale className="mr-3 h-6 w-6 text-primary" />
              All-Time Financial Overview
            </CardTitle>
            <CardDescription>
              Your total income, expenses, and net balance (all figures in {baseCurrencySymbolToShow}). Click on income or expenses to see details.
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
                  {baseCurrencySymbolToShow}{totalIncome.toFixed(2)}
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
                  {baseCurrencySymbolToShow}{totalExpensesAllTime.toFixed(2)}
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
                {baseCurrencySymbolToShow}{netBalance.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Manage Currencies</CardTitle>
            <CardDescription>Base currency: {baseCurrency ? `${baseCurrency.name} (${baseCurrencySymbolToShow})` : "Loading..."}. Add or edit other currencies.</CardDescription>
          </div>
          <Dialog open={isCurrencyFormOpen} onOpenChange={(isOpen) => {
            setIsCurrencyFormOpen(isOpen);
            if (!isOpen) setEditingCurrency(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md" disabled={isLoading || !user}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingCurrency ? "Edit Currency" : "Add New Currency"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingCurrency ? "Edit Currency" : "Add New Currency"}</DialogTitle>
                </DialogHeader>
                <CurrencyForm
                    onSubmit={editingCurrency ? handleUpdateCurrency : handleAddCurrency}
                    existingCurrency={editingCurrency}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <CurrencyList
            currencies={currencies}
            exchangeRates={exchangeRates}
            onEditCurrency={handleOpenEditCurrency}
            onDeleteCurrency={handleDeleteCurrency}
            onEditRate={handleOpenRateEdit}
            baseCurrencyId={BASE_CURRENCY_ID}
            baseCurrencySymbol={baseCurrencySymbolToShow}
          />
           {currencies.length === 0 && !isLoading && user && (
            <p className="text-muted-foreground text-center py-4">No currencies found. Add one to get started or wait for defaults to load.</p>
          )}
        </CardContent>
      </Card>

      {currencyForRateEdit && (
        <Dialog open={isRateFormOpen} onOpenChange={(isOpen) => {
            setIsRateFormOpen(isOpen);
            if(!isOpen) setCurrencyForRateEdit(undefined);
        }}>
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Set Exchange Rate for {currencyForRateEdit.code}</DialogTitle>
                    <DialogDescription>Define the rate to convert 1 {currencyForRateEdit.code} to the base currency ({baseCurrencySymbolToShow}).</DialogDescription>
                </DialogHeader>
                <ExchangeRateForm
                    currency={currencyForRateEdit}
                    baseCurrencyCode={baseCurrency?.code || "USD"}
                    currentRate={exchangeRates.find(r => r.currencyId === currencyForRateEdit.id)?.rateToBase || 1.0}
                    onSubmit={(rate) => handleSetExchangeRate(currencyForRateEdit.id, rate)}
                />
            </DialogContent>
        </Dialog>
      )}

      <Card className="shadow-xl border-destructive/50">
        <CardHeader>
            <CardTitle className="text-xl text-destructive">Data Management</CardTitle>
            <CardDescription>Permanently clear specific types of your application data from Firestore.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AlertDialog open={isClearCategoriesDialogOpen} onOpenChange={setIsClearCategoriesDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-md" disabled={isClearingCategories || !user}>
                        <Trash2 className="mr-2 h-4 w-4" /> {isClearingCategories ? "Clearing..." : "Clear Categories & Defaults"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Clear Categories & Re-seed Defaults?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete all your categories and re-seed the default ones. Expenses/Budgets using custom categories might need adjustment. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingCategories}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClearData('categories', setIsClearCategoriesDialogOpen, setIsClearingCategories, 'Categories & Defaults', true)} disabled={isClearingCategories}>
                        Yes, Clear & Re-seed
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             <AlertDialog open={isClearBudgetsDialogOpen} onOpenChange={setIsClearBudgetsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-md" disabled={isClearingBudgets || !user}>
                        <Trash2 className="mr-2 h-4 w-4" /> {isClearingBudgets ? "Clearing..." : "Clear Budgets & Defaults"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Clear Budget Goals & Re-seed Defaults?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete all your budget goals and re-seed any default sample goals. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingBudgets}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClearData('budgetGoals', setIsClearBudgetsDialogOpen, setIsClearingBudgets, 'Budgets & Defaults', true)} disabled={isClearingBudgets}>
                        Yes, Clear & Re-seed
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isClearExpensesDialogOpen} onOpenChange={setIsClearExpensesDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-md" disabled={isClearingExpenses || !user}>
                        <Trash2 className="mr-2 h-4 w-4" /> {isClearingExpenses ? "Clearing..." : "Clear All Expenses"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Expenses?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete all your expense entries. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingExpenses}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClearData('expenses', setIsClearExpensesDialogOpen, setIsClearingExpenses, 'Expenses', false)} disabled={isClearingExpenses}>
                        Yes, Clear Expenses
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isClearIncomesDialogOpen} onOpenChange={setIsClearIncomesDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-md" disabled={isClearingIncomes || !user}>
                        <Trash2 className="mr-2 h-4 w-4" /> {isClearingIncomes ? "Clearing..." : "Clear All Incomes"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Incomes?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete all your income entries. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingIncomes}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClearData('incomes', setIsClearIncomesDialogOpen, setIsClearingIncomes, 'Incomes', false)} disabled={isClearingIncomes}>
                        Yes, Clear Incomes
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isClearSavingsDialogOpen} onOpenChange={setIsClearSavingsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full shadow-md" disabled={isClearingSavings || !user}>
                        <Trash2 className="mr-2 h-4 w-4" /> {isClearingSavings ? "Clearing..." : "Clear Saving Goals & Defaults"}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Clear Saving Goals & Re-seed Defaults?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete all your saving goals and re-seed any default sample goals. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingSavings}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleConfirmClearData('savingGoals', setIsClearSavingsDialogOpen, setIsClearingSavings, 'Saving Goals & Defaults', true)} disabled={isClearingSavings}>
                        Yes, Clear & Re-seed
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
         <CardContent className="pt-2">
             <p className="text-xs text-muted-foreground mt-2">
                These operations will delete specific sets of your financial data from the Firestore database. Structural data like categories will be reset to defaults if cleared.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
