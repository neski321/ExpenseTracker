
"use client";

import React, { useState, useEffect } from "react";
import { SavingGoalForm } from "@/components/savings/saving-goal-form";
import { SavingGoalList } from "@/components/savings/saving-goal-list";
import type { SavingGoal, Currency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, PiggyBank } from "lucide-react";
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
    initialSavingGoalsData,
    initialCurrenciesData,
} from "@/lib/mock-data";
import { getCurrencySymbol, BASE_CURRENCY_ID } from "@/lib/currency-utils";

export default function SavingsGoalsPage() {
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [currencies, setCurrenciesState] = useState<Currency[]>([]); // Renamed
  const [baseCurrencySymbol, setBaseCurrencySymbol] = useState<string>("$");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSavingGoal, setEditingSavingGoal] = useState<SavingGoal | undefined>(undefined);
  const { toast } = useToast();

  const refreshSavingGoalsState = React.useCallback(() => {
    const sortedGoals = [...initialSavingGoalsData].sort((a, b) => {
        if (a.targetDate && b.targetDate) {
            return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        }
        if (a.targetDate && !b.targetDate) return -1; 
        if (!a.targetDate && b.targetDate) return 1;  
        return a.name.localeCompare(b.name); 
    });
    setSavingGoals(sortedGoals);
  }, [initialSavingGoalsData]);

  const refreshCurrenciesState = React.useCallback(() => {
    setCurrenciesState([...initialCurrenciesData]);
    setBaseCurrencySymbol(getCurrencySymbol(BASE_CURRENCY_ID, initialCurrenciesData));
  }, [initialCurrenciesData]);

  useEffect(() => {
    refreshSavingGoalsState();
    refreshCurrenciesState();
  }, [
      refreshSavingGoalsState,
      refreshCurrenciesState,
      initialSavingGoalsData, 
      initialCurrenciesData
    ]);

  const handleAddGoal = (data: Omit<SavingGoal, "id" | "iconName">) => {
    const newGoal: SavingGoal = { 
        ...data, 
        id: `sg${Date.now()}`, // Use Date.now() for better uniqueness
        iconName: data.iconName || undefined, // Ensure iconName is properly handled
    };
    initialSavingGoalsData.push(newGoal);
    refreshSavingGoalsState();
    setIsFormOpen(false);
  };

  const handleUpdateGoal = (data: Omit<SavingGoal, "id" | "iconName">) => {
    if (!editingSavingGoal) return;
    const indexInGlobal = initialSavingGoalsData.findIndex(goal => goal.id === editingSavingGoal.id);
    if (indexInGlobal !== -1) {
      initialSavingGoalsData[indexInGlobal] = { 
        ...initialSavingGoalsData[indexInGlobal], 
        ...data,
        iconName: data.iconName || initialSavingGoalsData[indexInGlobal].iconName, // Preserve icon if not changed
      };
    }
    refreshSavingGoalsState();
    setEditingSavingGoal(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (goal: SavingGoal) => {
    setEditingSavingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = (goalId: string) => {
    const indexInGlobal = initialSavingGoalsData.findIndex(goal => goal.id === goalId);
    if (indexInGlobal !== -1) {
      initialSavingGoalsData.splice(indexInGlobal, 1);
    }
    refreshSavingGoalsState();
    toast({
      title: "Saving Goal Deleted",
      description: "The saving goal has been removed.",
      variant: "destructive"
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <PiggyBank className="h-8 w-8 text-primary" />
            <div>
                <CardTitle className="text-2xl">Manage Savings Goals</CardTitle>
                <CardDescription>Set, track, and achieve your financial objectives. Amounts are in {baseCurrencySymbol}.</CardDescription>
            </div>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingSavingGoal(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingSavingGoal ? "Edit Goal" : "Add New Goal"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{editingSavingGoal ? "Edit Saving Goal" : "Add New Saving Goal"}</DialogTitle>
                    <DialogDescription>
                    {editingSavingGoal ? "Update the details of this saving goal." : "Create a new goal to save towards."}
                    </DialogDescription>
                </DialogHeader>
                <SavingGoalForm 
                    onSubmit={editingSavingGoal ? handleUpdateGoal : handleAddGoal}
                    existingGoal={editingSavingGoal}
                    baseCurrencySymbol={baseCurrencySymbol}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <SavingGoalList 
            goals={savingGoals} 
            baseCurrencySymbol={baseCurrencySymbol}
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

    