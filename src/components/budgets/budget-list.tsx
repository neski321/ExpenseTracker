"use client";

import type { Budget, Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCategoryNameWithHierarchy } from "@/lib/category-utils"; // Import new helper
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface BudgetListProps {
  budgets: Budget[];
  categories: Category[]; // Pass all categories for name resolution
  baseCurrencySymbol: string;
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export function BudgetList({ budgets, categories, baseCurrencySymbol, onEdit, onDelete }: BudgetListProps) {
  
  if (budgets.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No budgets set yet. Create one to start tracking!</p>;
  }

  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const progress = budget.goalAmount > 0 ? (budget.spentAmount / budget.goalAmount) * 100 : 0;
        // Use the new helper to get potentially hierarchical name
        const categoryDisplayName = getCategoryNameWithHierarchy(budget.categoryId, categories);
        
        return (
          <Card key={budget.id} className="shadow-md hover:shadow-lg transition-shadow relative group">
            <Link 
              href={`/expenses/category/${budget.categoryId}?from=budgets`} 
              className="absolute inset-0 z-10" 
              aria-label={`View expenses for ${categoryDisplayName}`}
            >
              <span className="sr-only">View expenses for ${categoryDisplayName}</span>
            </Link>
            <CardHeader className="pb-2 relative">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg hover:underline group-hover:text-primary transition-colors">
                    {categoryDisplayName}
                    <ExternalLink className="inline-block ml-2 h-4 w-4 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </CardTitle>
                  <CardDescription>
                    Target: {baseCurrencySymbol}{budget.goalAmount.toFixed(2)}
                  </CardDescription>
                </div>
                <div className="space-x-1 relative z-20"> 
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(budget); }} 
                    aria-label={`Edit budget for ${categoryDisplayName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog open={confirmId === budget.id} onOpenChange={open => setConfirmId(open ? budget.id : null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmId(budget.id); }} 
                        aria-label={`Delete budget for ${categoryDisplayName}`} 
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this budget goal? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(budget.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Spent: {baseCurrencySymbol}{budget.spentAmount.toFixed(2)}</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              {progress > 100 && (
                <Badge variant="destructive" className="mt-2">Over Budget</Badge>
              )}
               {progress <= 100 && progress >=80 && (
                <Badge variant="default" className="mt-2 bg-orange-500 hover:bg-orange-600">Nearing Limit</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
