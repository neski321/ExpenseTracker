
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
import { 
    initialIncomeSourcesData, 
    initialIncomesData, 
    initialCurrenciesData,
    addImportedIncomes
} from "@/lib/mock-data";
import { parseCSV, parseExcel, processImportedIncomes } from "@/lib/import-utils";


export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [incomeSources, setIncomeSourcesState] = useState<IncomeSource[]>([]);
  const [currencies, setCurrenciesState] = useState<Currency[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const refreshIncomesState = useCallback(() => {
    setIncomes([...initialIncomesData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [initialIncomesData]);

  const refreshIncomeSourcesState = useCallback(() => {
    setIncomeSourcesState([...initialIncomeSourcesData]);
  }, [initialIncomeSourcesData]);

  const refreshCurrenciesState = useCallback(() => {
    setCurrenciesState([...initialCurrenciesData]);
  }, [initialCurrenciesData]);

  useEffect(() => {
    refreshIncomesState();
    refreshIncomeSourcesState();
    refreshCurrenciesState();
  }, [
      refreshIncomesState,
      refreshIncomeSourcesState,
      refreshCurrenciesState,
      initialIncomesData,
      initialIncomeSourcesData,
      initialCurrenciesData
    ]);

  const handleAddIncome = (data: Omit<Income, "id">) => {
    const newIncome = { ...data, id: `inc${Date.now()}` };
    initialIncomesData.push(newIncome);
    refreshIncomesState();
    setIsFormOpen(false);
  };

  const handleUpdateIncome = (data: Omit<Income, "id">) => {
    if (!editingIncome) return;
    const indexInGlobal = initialIncomesData.findIndex(inc => inc.id === editingIncome.id);
    if (indexInGlobal !== -1) {
      initialIncomesData[indexInGlobal] = { ...initialIncomesData[indexInGlobal], ...data };
    }
    refreshIncomesState();
    setEditingIncome(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const handleDelete = (incomeId: string) => {
    const indexInGlobal = initialIncomesData.findIndex(inc => inc.id === incomeId);
    if (indexInGlobal !== -1) {
      initialIncomesData.splice(indexInGlobal, 1);
    }
    refreshIncomesState();
    toast({
      title: "Income Deleted",
      description: "The income entry has been removed successfully.",
      variant: "destructive"
    });
  };

  const handleExport = () => {
    toast({
        title: "Export Started",
        description: "Your income data is being prepared for download. (This is a placeholder)",
      });
    console.log("Exporting income to Excel...");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      const { newIncomes: importedIncomes, errors: processingErrors, infoMessages: processingInfoMessages, skippedRows } = processImportedIncomes(
          rawData,
          initialIncomeSourcesData,
          initialCurrenciesData
        );

      if (importedIncomes.length > 0) {
        addImportedIncomes(importedIncomes); 
        // refreshIncomesState(); // The useEffect will handle this
      }

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
            description: `No income entries imported. ${skippedRows} row(s) skipped. This could be due to empty rows or data not matching requirements.`,
            variant: "default",
            duration: 7000,
        });
      } else if (processingErrors.length > 0 && importedIncomes.length === 0) {
         toast({
            title: "Import Failed",
            description: `No income entries imported. ${skippedRows} row(s) skipped. Check console for details.`,
            variant: "destructive",
            duration: 7000,
        });
        processingErrors.forEach(err => console.error("Income import error:", err));
        processingInfoMessages.forEach(info => console.info("Income import info:", info));
      } else {
         toast({
          title: "Import Info",
          description: `No new income entries were imported. ${processingInfoMessages.length > 0 ? "Check console for processing info." : "The file might be empty or not match the expected format."}`,
           variant: "default"
        });
        processingInfoMessages.forEach(info => console.info("Income import info:", info));
      }

    } catch (error: any) {
      console.error("Income import failed:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Could not parse the file.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
              <Button className="shadow-md" disabled={isImporting}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingIncome ? "Edit Income" : "Add New Income"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
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
              disabled={isImporting}
            />
            <Button variant="outline" onClick={handleImportClick} className="shadow-sm w-full sm:w-auto" disabled={isImporting}>
              <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import Income"}
            </Button>
            <Button variant="outline" onClick={handleExport} className="shadow-sm w-full sm:w-auto" disabled={isImporting}>
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
