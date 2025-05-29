
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Download, PlusCircle, Upload, Coins } from "lucide-react";
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
import { getCategoriesCol } from "@/lib/services/category-service";
import { getPaymentMethodsCol } from "@/lib/services/payment-method-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import {
  addExpenseDoc,
  getExpensesCol,
  updateExpenseDoc,
  deleteExpenseDoc,
} from "@/lib/services/expense-service";
import { parseCSV, parseExcel, processImportedExpenses } from "@/lib/import-utils";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getCategoryNameWithHierarchy } from "@/lib/category-utils";
import { getCurrency } from "@/lib/currency-utils";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
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
      const [userExpenses, userCategories, userPaymentMethods, userCurrencies] = await Promise.all([
        getExpensesCol(user.uid),
        getCategoriesCol(user.uid),
        getPaymentMethodsCol(user.uid),
        getCurrenciesCol(user.uid)
      ]);
      setExpenses(userExpenses);
      setCategories(userCategories);
      setPaymentMethods(userPaymentMethods);
      setCurrencies(userCurrencies);
    } catch (error: any) {
      console.error("Failed to fetch page data:", error);
      toast({ title: "Error Loading Data", description: error.message || "Could not load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleAddExpense = async (data: Omit<Expense, "id">) => {
    if (!user) return;
    try {
      await addExpenseDoc(user.uid, data);
      toast({ title: "Expense Added!", description: "Your expense has been successfully recorded." });
      fetchPageData(); 
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Adding Expense", description: error.message || "Could not add expense.", variant: "destructive" });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleUpdateExpense = async (data: Omit<Expense, "id">) => {
    if (!user || !editingExpense) return;
    try {
      await updateExpenseDoc(user.uid, editingExpense.id, data);
      toast({ title: "Expense Updated!", description: "Your expense has been successfully updated." });
      fetchPageData(); 
      setEditingExpense(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Updating Expense", description: error.message || "Could not update expense.", variant: "destructive" });
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!user) return;
    try {
      await deleteExpenseDoc(user.uid, expenseId);
      toast({ title: "Expense Deleted", description: "The expense has been removed successfully.", variant: "destructive" });
      fetchPageData(); 
    } catch (error: any) {
      toast({ title: "Error Deleting Expense", description: error.message || "Could not delete expense.", variant: "destructive" });
    }
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
      
      const userCategories = await getCategoriesCol(user.uid);
      const userPaymentMethods = await getPaymentMethodsCol(user.uid);
      const userCurrencies = await getCurrenciesCol(user.uid);
      
      setCategories(userCategories); 
      setPaymentMethods(userPaymentMethods);
      setCurrencies(userCurrencies);

      const { newExpenses: importedExpenses, errors: processingErrors, infoMessages: processingInfoMessages, skippedRows, createdCategoryCount } = await processImportedExpenses(
        user.uid, // Pass userId for category creation
        rawData,
        userCategories, 
        userCurrencies,
        userPaymentMethods
      );

      if (importedExpenses.length > 0) {
        for (const exp of importedExpenses) {
          await addExpenseDoc(user.uid, exp); 
        }
      }
      
      if (createdCategoryCount > 0) {
        toast({ title: "Categories Updated", description: `${createdCategoryCount} new category/sub-category(-ies) created during import.`});
      }
      
      fetchPageData();

      let summaryMessage = `${importedExpenses.length} expense(s) imported.`;
      if (skippedRows > 0) {
        summaryMessage += ` ${skippedRows} row(s) skipped.`;
      }
      if (createdCategoryCount > 0) {
        summaryMessage += ` ${createdCategoryCount} new categor(y/ies) created.`;
      }
      

      if (processingErrors.length > 0) {
        toast({
          title: importedExpenses.length > 0 ? "Import Partially Successful" : "Import Failed",
          description: `${summaryMessage} Some rows had errors. Check console for details.`,
          variant: importedExpenses.length > 0 ? "default" : "destructive",
          duration: 7000,
        });
        processingErrors.forEach(err => console.error("Expense import processing error:", err));
        processingInfoMessages.forEach(info => console.info("Expense import processing info:", info));
      } else if (importedExpenses.length > 0 || createdCategoryCount > 0) {
        toast({
          title: "Import Successful",
          description: `${summaryMessage}${processingInfoMessages.length > 0 ? " Check console for additional info." : ""}`,
        });
        processingInfoMessages.forEach(info => console.info("Expense import processing info:", info));
      } else if (skippedRows > 0 && processingErrors.length === 0 && processingInfoMessages.length === 0) {
         toast({
            title: "Import Information",
            description: `No expenses imported. ${skippedRows} row(s) skipped.`,
            variant: "default",
            duration: 7000,
        });
      } else {
         toast({
          title: "Import Info",
          description: `No new expenses were imported. ${processingInfoMessages.length > 0 ? "Check console for processing info." : "File might be empty or not match requirements."}`,
          variant: "default"
        });
        processingInfoMessages.forEach(info => console.info("Expense import processing info:", info));
      }

    } catch (error: any) {
      console.error("Import failed:", error);
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
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.14))] bg-background p-4">
            <Coins className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading expenses...</p>
        </div>
    );
  }

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
              <Button className="shadow-md" disabled={isImporting || isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingExpense ? "Edit Expense" : "Add New Expense"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
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
              disabled={isImporting || isLoading}
            />
            <Button variant="outline" onClick={handleImportClick} className="shadow-sm w-full sm:w-auto" disabled={isImporting || isLoading}>
              <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import Expenses"}
            </Button>
            <Button variant="outline" onClick={handleExport} className="shadow-sm w-full sm:w-auto" disabled={isImporting || expenses.length === 0 || isLoading}>
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
