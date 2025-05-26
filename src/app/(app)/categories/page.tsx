
"use client";

import React, { useState, useEffect } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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
import { initialCategoriesData, initialExpensesData } from "@/lib/mock-data"; // Added initialExpensesData

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const { toast } = useToast();

  const refreshCategoriesState = React.useCallback(() => {
    setCategories([...initialCategoriesData]);
  }, [initialCategoriesData]);

  useEffect(() => {
    refreshCategoriesState();
  }, [refreshCategoriesState, initialCategoriesData]); // Ensure initialCategoriesData is a dependency

  const handleAddCategory = (data: Omit<Category, "id" | "iconName">) => {
    const newCategory: Category = { 
        ...data, 
        id: `cat${Date.now()}`, // Use Date.now() for better uniqueness
        iconName: undefined, 
        parentId: data.parentId,
    };
    initialCategoriesData.push(newCategory);
    refreshCategoriesState();
    setIsFormOpen(false);
  };

  const handleUpdateCategory = (data: Omit<Category, "id" | "iconName">) => {
    if (!editingCategory) return;
    const indexInGlobal = initialCategoriesData.findIndex(cat => cat.id === editingCategory.id);
    if (indexInGlobal !== -1) {
      initialCategoriesData[indexInGlobal] = { 
        ...initialCategoriesData[indexInGlobal], 
        name: data.name, 
        parentId: data.parentId 
      };
    }
    refreshCategoriesState();
    setEditingCategory(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    const hasChildren = initialCategoriesData.some(cat => cat.parentId === categoryId);
    if (hasChildren) {
      toast({
        title: "Cannot Delete Category",
        description: "This category has sub-categories. Please delete or reassign them first.",
        variant: "destructive",
      });
      return;
    }
    // Check if category is in use by expenses
    const isUsedInExpenses = initialExpensesData.some(exp => exp.categoryId === categoryId);
    if (isUsedInExpenses) {
         toast({
            title: "Cannot Delete Category",
            description: "This category is currently used by one or more expenses. Please reassign those expenses first.",
            variant: "destructive",
        });
        return;
    }
    // TODO: Add check if category is in use by budgets before deleting (requires access to initialBudgetGoalsData)

    const indexInGlobal = initialCategoriesData.findIndex(cat => cat.id === categoryId);
    if (indexInGlobal !== -1) {
      initialCategoriesData.splice(indexInGlobal, 1);
    }
    refreshCategoriesState();
    toast({
      title: "Category Deleted",
      description: "The category has been removed successfully.",
      variant: "destructive"
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Manage Categories</CardTitle>
            <CardDescription>Organize your expenses by creating and managing categories and sub-categories.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingCategory(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingCategory ? "Edit Category" : "Add New Category"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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
        </CardHeader>
        <CardContent>
          <CategoryList 
            categories={categories} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

    