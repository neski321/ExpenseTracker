
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";
import type { Category, Expense, Currency, ExchangeRate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Tags, BarChart3, ListTree, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  addCategoryDoc,
  getCategoriesCol,
  updateCategoryDoc,
  deleteCategoryDoc,
} from "@/lib/services/category-service";
import { getExpensesCol } from "@/lib/services/expense-service";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import { getExchangeRatesCol } from "@/lib/services/exchange-rate-service";
import { MainCategorySpendingChart } from "@/components/charts/main-category-spending-chart";
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
} from 'date-fns';

type FilterPeriod = "all" | "year" | "month" | "week";
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allFetchedExpenses, setAllFetchedExpenses] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const { toast } = useToast();

  const [activeFilterPeriod, setActiveFilterPeriod] = useState<FilterPeriod>("all");
  const [selectedFilterYear, setSelectedFilterYear] = useState<number | "all">("all");
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<number | "all">("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchPageData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setIsChartLoading(false);
      return;
    }
    setIsLoading(true);
    setIsChartLoading(true);
    try {
      const [userCategories, userExpenses, userCurrencies, userExchangeRates] = await Promise.all([
        getCategoriesCol(user.uid),
        getExpensesCol(user.uid),
        getCurrenciesCol(user.uid),
        getExchangeRatesCol(user.uid),
      ]);
      setCategories(userCategories);
      setAllFetchedExpenses(userExpenses);
      setCurrencies(userCurrencies);
      setExchangeRates(userExchangeRates);

      if (userExpenses.length > 0) {
        const years = Array.from(new Set(userExpenses.map(exp => getYear(new Date(exp.date)))))
          .sort((a, b) => b - a);
        setAvailableYears(years);
      } else {
        setAvailableYears([]);
      }

    } catch (error) {
      console.error("Failed to fetch categories page data:", error);
      toast({ title: "Error", description: "Could not load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsChartLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const filteredExpensesForChart = useMemo(() => {
    if (!allFetchedExpenses) return [];
    const now = new Date();
    let expensesToProcess = [...allFetchedExpenses];

    if (selectedFilterYear !== "all") {
      expensesToProcess = expensesToProcess.filter(exp => getYear(new Date(exp.date)) === selectedFilterYear);
      if (selectedFilterMonth !== "all") {
        expensesToProcess = expensesToProcess.filter(exp => getMonth(new Date(exp.date)) === selectedFilterMonth);
      }
      return expensesToProcess;
    }

    // Fallback to tab-based activeFilterPeriod if specific year/month not selected
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    switch (activeFilterPeriod) {
      case "week":
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        periodEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        periodStart = startOfMonth(now);
        periodEnd = endOfMonth(now);
        break;
      case "year":
        periodStart = startOfYear(now);
        periodEnd = endOfYear(now);
        break;
      case "all":
      default:
        return expensesToProcess;
    }

    if (periodStart && periodEnd) {
      return expensesToProcess.filter(exp =>
        isValid(new Date(exp.date)) && isWithinInterval(new Date(exp.date), { start: periodStart!, end: periodEnd! })
      );
    }
    return expensesToProcess;
  }, [allFetchedExpenses, activeFilterPeriod, selectedFilterYear, selectedFilterMonth]);

  const getChartTabDescription = () => {
    const now = new Date();
    let periodDescription = "";

    if (selectedFilterYear !== "all") {
      const yearStr = selectedFilterYear.toString();
      const monthStr = selectedFilterMonth !== "all" ? monthNames[selectedFilterMonth] + " " : "";
      periodDescription = `for ${monthStr}${yearStr}`;
    } else {
      switch(activeFilterPeriod) {
        case "week":
          periodDescription = `for the current week (${format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(now, { weekStartsOn: 1 }), 'MMM d, yyyy')})`;
          break;
        case "month":
          periodDescription = `for the current month (${format(now, 'MMMM yyyy')})`;
          break;
        case "year":
          periodDescription = `for the current year (${format(now, 'yyyy')})`;
          break;
        case "all":
        default:
          periodDescription = "across all time";
          break;
      }
    }
    return `Spending distribution across main categories ${periodDescription}. Click a bar for details.`;
  };

  const handleFilterTabChange = (value: string) => {
    setActiveFilterPeriod(value as FilterPeriod);
    setSelectedFilterYear("all");
    setSelectedFilterMonth("all");
  };

  const handleYearSelectChange = (value: string) => {
    const yearValue = value === "all" ? "all" : parseInt(value);
    setSelectedFilterYear(yearValue);
    if (yearValue === "all") {
      setSelectedFilterMonth("all"); // Reset month if "All Years" is selected
    }
  };

  const handleMonthSelectChange = (value: string) => {
    setSelectedFilterMonth(value === "all" ? "all" : parseInt(value));
  };

  const handleAddCategory = async (data: Omit<Category, "id" | "iconName">) => {
    if (!user) return;
    const categoryDataWithOptionalIcon: Omit<Category, "id"> = { ...data, iconName: undefined };
    try {
      await addCategoryDoc(user.uid, categoryDataWithOptionalIcon);
      toast({ title: "Category Added!", description: `Category "${data.name}" has been successfully added.` });
      fetchPageData(); 
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error adding category", description: error.message || "Could not add category.", variant: "destructive" });
    }
  };

  const handleUpdateCategory = async (data: Omit<Category, "id" | "iconName">) => {
    if (!user || !editingCategory) return;
    
    const categoryUpdatePayload: Partial<Omit<Category, "id">> = {
        name: data.name,
        parentId: data.parentId, 
    };

    if (editingCategory.iconName !== undefined) {
      categoryUpdatePayload.iconName = editingCategory.iconName;
    }

    try {
      await updateCategoryDoc(user.uid, editingCategory.id, categoryUpdatePayload);
      toast({ title: "Category Updated!", description: `Category "${data.name}" has been successfully updated.` });
      fetchPageData();
      setEditingCategory(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error updating category", description: error.message || "Could not update category.", variant: "destructive" });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!user) return;
    
    try {
      await deleteCategoryDoc(user.uid, categoryId);
      toast({ title: "Category Deleted", description: "The category has been removed successfully.", variant: "destructive" });
      fetchPageData(); 
    } catch (error: any) {
      toast({
        title: "Cannot Delete Category",
        description: error.message || "Could not delete category.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading categories data...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-2xl">Main Category Spending Overview</CardTitle>
              <CardDescription>{getChartTabDescription()}</CardDescription>
            </div>
          </div>
          <Tabs value={activeFilterPeriod} onValueChange={handleFilterTabChange} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Select value={selectedFilterYear.toString()} onValueChange={handleYearSelectChange}>
              <SelectTrigger className="w-full sm:w-[180px] shadow-sm">
                <SelectValue placeholder="Filter by Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedFilterMonth === "all" ? "all" : selectedFilterMonth.toString()}
              onValueChange={handleMonthSelectChange}
              disabled={selectedFilterYear === "all"}
            >
              <SelectTrigger className="w-full sm:w-[180px] shadow-sm">
                <SelectValue placeholder="Filter by Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthNames.map((name, index) => (
                  <SelectItem key={index} value={index.toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isChartLoading ? (
            <div className="flex justify-center items-center h-[300px]">
              <p>Loading chart...</p>
            </div>
          ) : (
            <MainCategorySpendingChart
              allCategories={categories}
              expensesToDisplay={filteredExpensesForChart}
              allCurrencies={currencies}
              allExchangeRates={exchangeRates}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-2xl">Manage Categories</CardTitle>
              <CardDescription>Organize your expenses by creating and managing categories and sub-categories.</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="shadow-md"
              onClick={() => setIsCategoryListVisible(!isCategoryListVisible)}
            >
              {isCategoryListVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {isCategoryListVisible ? "Hide List" : "Show List"}
            </Button>
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingCategory(undefined);
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-md">
                  <PlusCircle className="mr-2 h-4 w-4" /> {editingCategory ? "Edit Category" : "Add New Category"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                      <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                      <DialogDescription>
                      {editingCategory ? "Update the details of this category." : "Create a new category or sub-category for your expenses."}
                      </DialogDescription>
                  </DialogHeader>
                  <CategoryForm
                      onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
                      existingCategory={editingCategory}
                      allCategories={categories}
                  />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isCategoryListVisible ? (
            <CategoryList
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Click &quot;Show List&quot; to view and manage your categories.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
