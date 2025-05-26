
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, Upload } from "lucide-react";
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
    initialCategoriesData, 
    initialExpensesData, 
    initialPaymentMethodsData, 
    initialCurrenciesData,
    addImportedExpenses
} from "@/lib/mock-data";
import { parseCSV, parseExcel, processImportedExpenses } from "@/lib/import-utils";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getCategoryNameWithHierarchy } from "@/lib/category-utils";
import { getCurrencySymbol, getCurrency } from "@/lib/currency-utils";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const refreshExpensesState = useCallback(() => {
    setExpenses([...initialExpensesData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [initialExpensesData]);

  const refreshCategoriesState = useCallback(() => {
    setCategories([...initialCategoriesData]);
  }, [initialCategoriesData]);

  const refreshPaymentMethodsState = useCallback(() => {
    setPaymentMethods([...initialPaymentMethodsData]);
  }, [initialPaymentMethodsData]);

  const refreshCurrenciesState = useCallback(() => {
    setCurrencies([...initialCurrenciesData]);
  }, [initialCurrenciesData]);


  useEffect(() => {
    refreshExpensesState();
    refreshCategoriesState();
    refreshPaymentMethodsState();
    refreshCurrenciesState();
  }, [
      refreshExpensesState,
      refreshCategoriesState,
      refreshPaymentMethodsState,
      refreshCurrenciesState,
    ]);

  const handleAddExpense = (data: Omit<Expense, "id">) => {
    const newExpense = { ...data, id: `exp${Date.now()}` };
    initialExpensesData.push(newExpense);
    refreshExpensesState();
    setIsFormOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = (data: Omit<Expense, "id">) => {
    if (!editingExpense) return;
    const indexInGlobal = initialExpensesData.findIndex(exp => exp.id === editingExpense.id);
    if (indexInGlobal !== -1) {
      initialExpensesData[indexInGlobal] = { ...initialExpensesData[indexInGlobal], ...data };
    }
    refreshExpensesState();
    setEditingExpense(undefined);
    setIsFormOpen(false);
  };

  const handleDelete = (expenseId: string) => {
    const indexInGlobal = initialExpensesData.findIndex(exp => exp.id === expenseId);
    if (indexInGlobal !== -1) {
      initialExpensesData.splice(indexInGlobal, 1);
    }
    refreshExpensesState();
    toast({
      title: "Expense Deleted",
      description: "The expense has been removed successfully.",
      variant: "destructive"
    });
  };

  const handleExport = () => {
    if (expenses.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no expenses to export.",
        variant: "default",
      });
      return;
    }

    const dataToExport = expenses.map(exp => {
      const categoryName = getCategoryNameWithHierarchy(exp.categoryId, categories);
      const paymentMethodName = exp.paymentMethodId 
        ? paymentMethods.find(pm => pm.id === exp.paymentMethodId)?.name || "N/A"
        : "N/A";
      const currencyCode = getCurrency(exp.currencyId, currencies)?.code || "UNK";

      return {
        Date: format(new Date(exp.date), "yyyy-MM-dd"),
        Description: exp.description,
        Amount: exp.amount,
        Currency: currencyCode,
        Category: categoryName,
        "Payment Method": paymentMethodName,
        "Is Subscription": exp.isSubscription ? "Yes" : "No",
        "Next Due Date": exp.nextDueDate ? format(new Date(exp.nextDueDate), "yyyy-MM-dd") : "N/A",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    
    const today = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(workbook, `PennyPincher_Expenses_${today}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Your expenses have been exported to Excel.",
    });
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

      if (rawData.length < 2) { // Check if there's at least one header and one data row
          toast({ title: "Import Error", description: "File is empty or has no data rows.", variant: "destructive"});
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
      }

      const { newExpenses: importedExpenses, errors: processingErrors, infoMessages: processingInfoMessages, skippedRows, createdCategoryCount } = processImportedExpenses(
        rawData,
        initialCategoriesData, 
        initialCurrenciesData,
        initialPaymentMethodsData
      );

      if (importedExpenses.length > 0) {
        addImportedExpenses(importedExpenses); 
      }
      if (createdCategoryCount > 0) {
        refreshCategoriesState(); // Refresh categories if new ones were created
      }

      let summaryMessage = `${importedExpenses.length} expense(s) imported.`;
      if (skippedRows > 0) {
        summaryMessage += ` ${skippedRows} row(s) skipped.`;
      }
      if (createdCategoryCount > 0) {
        summaryMessage += ` ${createdCategoryCount} new categor(y/ies) created.`;
      }

      if (processingErrors.length > 0) {
        toast({
          title: importedExpenses.length > 0 || createdCategoryCount > 0 ? "Import Partially Successful" : "Import Failed",
          description: `${summaryMessage} Some rows had errors. Check console for details.`,
          variant: importedExpenses.length > 0 || createdCategoryCount > 0 ? "default" : "destructive",
          duration: 7000,
        });
        processingErrors.forEach(err => console.error("Import processing error:", err));
        processingInfoMessages.forEach(info => console.info("Import processing info:", info));
      } else if (importedExpenses.length > 0 || createdCategoryCount > 0) {
        toast({
          title: "Import Successful",
          description: `${summaryMessage}${processingInfoMessages.length > 0 ? " Check console for additional info." : ""}`,
        });
        processingInfoMessages.forEach(info => console.info("Import processing info:", info));
      } else if (skippedRows > 0 && processingErrors.length === 0 && processingInfoMessages.length === 0) {
         toast({
            title: "Import Information",
            description: `No expenses imported. ${skippedRows} row(s) skipped. This may be due to empty rows or data not matching requirements.`,
            variant: "default",
            duration: 7000,
        });
      } else if (processingErrors.length > 0 && importedExpenses.length === 0 && createdCategoryCount === 0) {
        toast({
            title: "Import Failed",
            description: `No expenses imported. ${skippedRows} row(s) skipped. Check console for details.`,
            variant: "destructive",
            duration: 7000,
        });
        processingErrors.forEach(err => console.error("Import processing error:", err));
        processingInfoMessages.forEach(info => console.info("Import processing info:", info));
      } else {
         toast({
          title: "Import Info",
          description: `No new expenses were imported. ${processingInfoMessages.length > 0 ? "Check console for processing info." : "The file might be empty or not match the expected format."}`,
          variant: "default"
        });
        processingInfoMessages.forEach(info => console.info("Import processing info:", info));
      }

    } catch (error: any) {
      console.error("Import failed:", error);
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
            <CardTitle className="text-2xl">Manage Expenses</CardTitle>
            <CardDescription>Track your daily spending and keep your finances in order.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingExpense(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md" disabled={isImporting}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingExpense ? "Edit Expense" : "Add New Expense"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? "Update the details of your expense." : "Enter the details of your new expense."}
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm
                categories={categories}
                paymentMethods={paymentMethods}
                currencies={currencies}
                onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
                initialData={editingExpense}
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
              <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import Expenses"}
            </Button>
            <Button variant="outline" onClick={handleExport} className="shadow-sm w-full sm:w-auto" disabled={isImporting || expenses.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export to Excel
            </Button>
          </div>
          <ExpenseList
            expenses={expenses}
            categories={categories}
            paymentMethods={paymentMethods}
            currencies={currencies}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            sourcePageIdentifier="expenses"
          />
        </CardContent>
      </Card>
    </div>
  );
}
