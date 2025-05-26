
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CurrencyList } from "@/components/settings/currency-list";
import { CurrencyForm } from "@/components/settings/currency-form";
import { ExchangeRateForm } from "@/components/settings/exchange-rate-form"; 
import type { Currency, ExchangeRate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Settings as SettingsIcon, Trash2 } from "lucide-react";
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
import { 
    initialCurrenciesData, 
    initialExchangeRatesData,
    resetAllDataToDefaults, 
    initialExpensesData, // For checking if currency is in use
} from "@/lib/mock-data";
import { BASE_CURRENCY_ID } from "@/lib/currency-utils";

export default function SettingsPage() {
  const router = useRouter();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isCurrencyFormOpen, setIsCurrencyFormOpen] = useState(false);
  const [isRateFormOpen, setIsRateFormOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | undefined>(undefined);
  const [currencyForRateEdit, setCurrencyForRateEdit] = useState<Currency | undefined>(undefined);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);

  const { toast } = useToast();

  const refreshCurrenciesState = React.useCallback(() => {
    setCurrencies([...initialCurrenciesData]);
  },[initialCurrenciesData]);

  const refreshExchangeRatesState = React.useCallback(() => {
    setExchangeRates([...initialExchangeRatesData]);
  },[initialExchangeRatesData]);

  useEffect(() => {
    refreshCurrenciesState();
    refreshExchangeRatesState();
  }, [
      refreshCurrenciesState, 
      refreshExchangeRatesState,
      initialCurrenciesData, // Add global arrays as direct dependencies
      initialExchangeRatesData
    ]);

  const handleAddCurrency = (data: Omit<Currency, "id">) => {
    const newCurrency = { 
        ...data, 
        id: `cur${Date.now()}`, // Use Date.now() for better uniqueness
    };
    initialCurrenciesData.push(newCurrency);
    // Add a default exchange rate if it's not the base currency
    if (newCurrency.id !== BASE_CURRENCY_ID) {
        initialExchangeRatesData.push({ currencyId: newCurrency.id, rateToBase: 1.0 });
    }
    
    refreshCurrenciesState();
    refreshExchangeRatesState();
    setIsCurrencyFormOpen(false);
    toast({ title: "Currency Added", description: `${data.name} (${data.code}) has been added.` });
  };

  const handleUpdateCurrency = (data: Omit<Currency, "id">) => {
    if (!editingCurrency) return;
    // Prevent changing code of base currency if it's USD
    if (editingCurrency.id === BASE_CURRENCY_ID && editingCurrency.code === "USD" && data.code !== "USD") {
         toast({ title: "Action Denied", description: "Cannot change the code of the base currency USD.", variant: "destructive" });
         return;
    }

    const indexInGlobal = initialCurrenciesData.findIndex(curr => curr.id === editingCurrency.id);
    if (indexInGlobal !== -1) {
        initialCurrenciesData[indexInGlobal] = { ...initialCurrenciesData[indexInGlobal], ...data };
    }
    refreshCurrenciesState();
    setEditingCurrency(undefined);
    setIsCurrencyFormOpen(false);
    toast({ title: "Currency Updated", description: `${data.name} (${data.code}) has been updated.` });
  };
  
  const handleDeleteCurrency = (currencyId: string) => {
    if (currencyId === BASE_CURRENCY_ID) {
        toast({ title: "Action Denied", description: "Cannot delete the base currency.", variant: "destructive" });
        return;
    }
    if (initialCurrenciesData.length <= 1) {
        toast({ title: "Action Denied", description: "Cannot delete the only remaining currency.", variant: "destructive" });
        return;
    }
    // Check if currency is in use by any expense
    const isCurrencyUsed = initialExpensesData.some(exp => exp.currencyId === currencyId);
    // TODO: Also check initialIncomesData if/when income uses multi-currency
    if (isCurrencyUsed) {
        toast({
            title: "Cannot Delete Currency",
            description: "This currency is currently used by one or more expenses or income entries. Please reassign them first.",
            variant: "destructive",
        });
        return;
    }

    const currencyIndex = initialCurrenciesData.findIndex(curr => curr.id === currencyId);
    if (currencyIndex > -1) initialCurrenciesData.splice(currencyIndex, 1);

    const rateIndex = initialExchangeRatesData.findIndex(rate => rate.currencyId === currencyId);
    if (rateIndex > -1) initialExchangeRatesData.splice(rateIndex, 1);

    refreshCurrenciesState();
    refreshExchangeRatesState();
    toast({ title: "Currency Deleted", variant: "destructive" });
  };

  const handleOpenEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency);
    setIsCurrencyFormOpen(true);
  };

  const handleOpenRateEdit = (currency: Currency) => {
    setCurrencyForRateEdit(currency);
    setIsRateFormOpen(true);
  };

  const handleSetExchangeRate = (currencyId: string, rate: number) => {
    const existingRateIndex = initialExchangeRatesData.findIndex(r => r.currencyId === currencyId);
    if (existingRateIndex > -1) {
      initialExchangeRatesData[existingRateIndex].rateToBase = rate;
    } else {
      // This case should ideally not happen if rate is added when currency is added
      initialExchangeRatesData.push({ currencyId, rateToBase: rate });
    }
    refreshExchangeRatesState();
    setIsRateFormOpen(false);
    setCurrencyForRateEdit(undefined);
    const currency = currencies.find(c => c.id === currencyId);
    toast({ title: "Exchange Rate Set", description: `Rate for ${currency?.code} updated to ${rate}.` });
  };

  const handleConfirmClearData = () => {
    resetAllDataToDefaults();
    // The individual refresh...State functions will be called by the main useEffect
    // due to their dependency on the global mock data arrays.
    // However, to ensure the dashboard and other complex pages fully re-evaluate,
    // router.refresh() is still beneficial.
    router.refresh(); 
    toast({
      title: "Application Data Cleared",
      description: "All entries have been erased and settings reset to default.",
      variant: "destructive"
    });
    setIsClearDataDialogOpen(false);
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center">
            <SettingsIcon className="mr-3 h-7 w-7 text-primary" />
            <div>
                <CardTitle className="text-2xl">Settings</CardTitle>
                <CardDescription>Manage application settings, including currencies, exchange rates, and data.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Manage Currencies</CardTitle>
            <CardDescription>Add, edit, or remove currencies used in the application.</CardDescription>
          </div>
          <Dialog open={isCurrencyFormOpen} onOpenChange={(isOpen) => {
            setIsCurrencyFormOpen(isOpen);
            if (!isOpen) setEditingCurrency(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingCurrency ? "Edit Currency" : "Add New Currency"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
          />
        </CardContent>
      </Card>
      
      {currencyForRateEdit && (
        <Dialog open={isRateFormOpen} onOpenChange={(isOpen) => {
            setIsRateFormOpen(isOpen);
            if(!isOpen) setCurrencyForRateEdit(undefined);
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Set Exchange Rate for {currencyForRateEdit.code}</DialogTitle>
                    <DialogDescription>Define the rate to convert 1 {currencyForRateEdit.code} to the base currency ({currencies.find(c=>c.id === BASE_CURRENCY_ID)?.code}).</DialogDescription>
                </DialogHeader>
                <ExchangeRateForm
                    currency={currencyForRateEdit}
                    currentRate={exchangeRates.find(r => r.currencyId === currencyForRateEdit.id)?.rateToBase || 1.0}
                    onSubmit={(rate) => handleSetExchangeRate(currencyForRateEdit.id, rate)}
                />
            </DialogContent>
        </Dialog>
      )}

      <Card className="shadow-xl border-destructive/50">
        <CardHeader>
            <CardTitle className="text-xl text-destructive">Data Management</CardTitle>
            <CardDescription>Perform actions related to all application data.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog open={isClearDataDialogOpen} onOpenChange={setIsClearDataDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto shadow-md">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear All Application Data
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all
                        your expenses, income, custom categories, payment methods, budgets, and saving goals, 
                        and reset currencies and exchange rates to their defaults.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmClearData} className={/* Use default destructive variant from button itself */ ""}>
                        Yes, Clear All Data
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">
                Use this option to reset the application to its initial state.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

    