"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { IncomeForm } from "@/components/income/income-form";
import { IncomeList } from "@/components/income/income-list";
import type { Income, IncomeSource, Currency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, DollarSign, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getIncomeSourcesCol } from "@/lib/services/income-source-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import {
  addIncomeDoc,
  getIncomesCol,
  updateIncomeDoc,
  deleteIncomeDoc,
} from "@/lib/services/income-service";
import { parseCSV, parseExcel, processImportedIncomes } from "@/lib/import-utils";
// import * as XLSX from 'xlsx'; // Keep if export is implemented later
// import { format } from 'date-fns'; // Keep if export is implemented later

export default function IncomePage() {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeSources, setIncomeSourcesState] = useState<IncomeSource[]>([]);
  const [currencies, setCurrenciesState] = useState<Currency[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchPageData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [userIncomes, userIncomeSources, userCurrencies] = await Promise.all([
        getIncomesCol(user.uid),
        getIncomeSourcesCol(user.uid),
        getCurrenciesCol(user.uid),
      ]);
      setIncomes(userIncomes);
      setIncomeSourcesState(userIncomeSources);
      setCurrenciesState(userCurrencies);
    } catch (error) {
      console.error("Failed to fetch income page data:", error);
      toast({ title: "Error", description: "Could not load income data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleAddIncome = async (data: Omit<Income, "id">) => {
    if (!user) return;
    try {
      await addIncomeDoc(user.uid, data);
      toast({ title: "Income Added!", description: "Your income has been successfully recorded." });
      fetchPageData(); 
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Adding Income", description: error.message || "Could not add income.", variant: "destructive" });
    }
  };

  const handleUpdateIncome = async (data: Omit<Income, "id">) => {
    if (!user || !editingIncome) return;
    try {
      await updateIncomeDoc(user.uid, editingIncome.id, data);
      toast({ title: "Income Updated!", description: "Your income entry has been successfully updated." });
      fetchPageData(); 
      setEditingIncome(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Updating Income", description: error.message || "Could not update income.", variant: "destructive" });
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const handleDelete = async (incomeId: string) => {
    if (!user) return;
    try {
      await deleteIncomeDoc(user.uid, incomeId);
      toast({ title: "Income Deleted", description: "The income entry has been removed successfully.", variant: "destructive" });
      fetchPageData(); 
    } catch (error: any) {
      toast({ title: "Error Deleting Income", description: error.message || "Could not delete income.", variant: "destructive" });
    }
  };

  const handleExport = () => {
    toast({
        title: "Export Not Yet Implemented",
        description: "Exporting income data will be available in a future update.",
      });
    console.log("Exporting income to Excel...");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to import data.", variant: "destructive" });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast({ title: "Importing...", description: `Processing ${file.name}.` });

    try {
      let rawData: any[][];
      if (file.name.endsWith('.csv')) {
        rawData = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        rawData = await parseExcel(file);
      } else {
        toast({ title: "Import Error", description: "Unsupported file type. Please use CSV or Excel.", variant: "destructive" });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (rawData.length < 2) {
          toast({ title: "Import Error", description: "File is empty or has no data rows.", variant: "destructive"});
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }
      
      // Fetch current user's income sources and currencies for accurate matching
      const [userIncomeSources, userCurrencies] = await Promise.all([
          getIncomeSourcesCol(user.uid),
          getCurrenciesCol(user.uid)
      ]);
      setIncomeSourcesState(userIncomeSources); // Update local state for form if needed
      setCurrenciesState(userCurrencies);


      const { newIncomes: importedIncomes, errors: processingErrors, infoMessages: processingInfoMessages, skippedRows } = processImportedIncomes(
          rawData,
          userIncomeSources, 
          userCurrencies    
        );

      if (importedIncomes.length > 0) {
        for (const inc of importedIncomes) {
          await addIncomeDoc(user.uid, inc); 
        }
      }
      
      fetchPageData(); // Refresh list from Firestore

      let summaryMessage = `${importedIncomes.length} income entry(s) imported.`;
      if (skippedRows > 0) {
        summaryMessage += ` ${skippedRows} row(s) skipped.`;
      }

      if (processingErrors.length > 0) {
        toast({
          title: importedIncomes.length > 0 ? "Import Partially Successful" : "Import Failed",
          description: `${summaryMessage} Some rows had issues. Check console for details.`,
          variant: importedIncomes.length > 0 ? "default" : "destructive",
          duration: 7000,
        });
        processingErrors.forEach(err => console.error("Income import error:", err));
        processingInfoMessages.forEach(info => console.info("Income import info:", info));
      } else if (importedIncomes.length > 0) {
        toast({
          title: "Import Successful",
          description: `${summaryMessage}${processingInfoMessages.length > 0 ? " Check console for additional info." : ""}`,
        });
        processingInfoMessages.forEach(info => console.info("Income import info:", info));
      } else if (skippedRows > 0 && processingErrors.length === 0 && processingInfoMessages.length === 0) {
         toast({
            title: "Import Information",
            description: `No income entries imported. ${skippedRows} row(s) skipped.`,
            variant: "default",
            duration: 7000,
        });
      } else {
         toast({
          title: "Import Info",
          description: `No new income entries were imported. ${processingInfoMessages.length > 0 ? "Check console for processing info." : "File might be empty or not match requirements."}`,
           variant: "default"
        });
        processingInfoMessages.forEach(info => console.info("Income import info:", info));
      }

    } catch (error: any) {
      console.error("Income import failed:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Could not parse or process the file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading income...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
                <DollarSign className="mr-3 h-7 w-7 text-primary"/> Manage Income
            </CardTitle>
            <CardDescription>Track your earnings and keep your finances in order.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingIncome(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md" disabled={isImporting || isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingIncome ? "Edit Income" : "Add New Income"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingIncome ? "Edit Income" : "Add New Income"}</DialogTitle>
                <DialogDescription>
                  {editingIncome ? "Update the details of your income entry." : "Enter the details of your new income entry."}
                </DialogDescription>
              </DialogHeader>
              <IncomeForm
                incomeSources={incomeSources}
                currencies={currencies}
                onSubmit={editingIncome ? handleUpdateIncome : handleAddIncome}
                initialData={editingIncome}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              disabled={isImporting || isLoading}
            />
            <Button variant="outline" onClick={handleImportClick} className="shadow-sm w-full sm:w-auto" disabled={isImporting || isLoading}>
              <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import Income"}
            </Button>
            <Button variant="outline" onClick={handleExport} className="shadow-sm w-full sm:w-auto" disabled={isImporting || isLoading || incomes.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
          </div>
          <IncomeList
            incomes={incomes}
            incomeSources={incomeSources}
            currencies={currencies}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
}
