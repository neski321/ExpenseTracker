
"use client"; // This layout needs to be a client component to use hooks

import React, { useState, useEffect, useCallback } from "react";
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Tags } from "lucide-react";
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
import {
  addCategoryDoc,
  getCategoriesCol,
  updateCategoryDoc,
  deleteCategoryDoc,
} from "@/lib/services/category-service";

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userCategories = await getCategoriesCol(user.uid);
      setCategories(userCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({ title: "Error", description: "Could not load categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    } else {
      setIsLoading(false); // Stop loading if no user
    }
  }, [user, fetchCategories]);

  const handleAddCategory = async (data: Omit<Category, "id" | "iconName">) => {
    if (!user) return;
    // For now, new categories won't have an iconName assigned from the form.
    // We can add icon selection later.
    const categoryDataWithOptionalIcon: Omit<Category, "id"> = { ...data, iconName: undefined };
    try {
      await addCategoryDoc(user.uid, categoryDataWithOptionalIcon);
      toast({ title: "Category Added!", description: `Category "${data.name}" has been successfully added.` });
      fetchCategories(); // Refresh list
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error adding category", description: error.message || "Could not add category.", variant: "destructive" });
    }
  };

  const handleUpdateCategory = async (data: Omit<Category, "id" | "iconName">) => {
    if (!user || !editingCategory) return;
    // Preserve existing iconName if not changed by form (currently form doesn't change it)
    const categoryUpdateData: Partial<Omit<Category, "id">> = {
        ...data,
        iconName: editingCategory.iconName 
    };
    try {
      await updateCategoryDoc(user.uid, editingCategory.id, categoryUpdateData);
      toast({ title: "Category Updated!", description: `Category "${data.name}" has been successfully updated.` });
      fetchCategories(); // Refresh list
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
      fetchCategories(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Cannot Delete Category",
        description: error.message || "Could not delete category.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading categories...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-7 w-7 text-primary" />
            <div>
              <CardTitle className="text-2xl">Manage Categories</CardTitle>
              <CardDescription>Organize your expenses by creating and managing categories and sub-categories.</CardDescription>
            </div>
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
