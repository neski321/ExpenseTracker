
"use client"; // This layout needs to be a client component to use hooks

import React, { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import { getCurrencySymbol, BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { getCurrenciesCol } from "@/lib/services/currency-service";
import {
  addSavingGoalDoc,
  getSavingGoalsCol,
  updateSavingGoalDoc,
  deleteSavingGoalDoc,
} from "@/lib/services/saving-goal-service";

export default function SavingsGoalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>([]);
  const [baseCurrencySymbol, setBaseCurrencySymbol] = useState<string>("$");
  const [isLoading, setIsLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSavingGoal, setEditingSavingGoal] = useState<SavingGoal | undefined>(undefined);

  const fetchPageData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedGoals, fetchedCurrencies] = await Promise.all([
        getSavingGoalsCol(user.uid),
        getCurrenciesCol(user.uid)
      ]);
      setSavingGoals(fetchedGoals);
      setUserCurrencies(fetchedCurrencies);
      setBaseCurrencySymbol(getCurrencySymbol(BASE_CURRENCY_ID, fetchedCurrencies));
    } catch (error) {
      console.error("Error fetching savings goals data:", error);
      toast({ title: "Error", description: "Could not load savings goals data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleAddGoal = async (data: Omit<SavingGoal, "id" | "iconName">) => {
    if (!user) return;
    // Form doesn't handle iconName directly yet, default to undefined or handle based on name
    const goalData: Omit<SavingGoal, "id"> = { ...data, iconName: undefined }; 
    try {
      await addSavingGoalDoc(user.uid, goalData);
      toast({ title: "Saving Goal Added!", description: `Goal "${data.name}" has been created.` });
      fetchPageData();
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not add saving goal.", variant: "destructive" });
    }
  };

  const handleUpdateGoal = async (data: Omit<SavingGoal, "id" | "iconName">) => {
    if (!user || !editingSavingGoal) return;
    const updateData: Partial<Omit<SavingGoal, "id">> = { 
        ...data, 
        iconName: editingSavingGoal.iconName // Preserve existing icon name
    };
    try {
      await updateSavingGoalDoc(user.uid, editingSavingGoal.id, updateData);
      toast({ title: "Saving Goal Updated!", description: `Goal "${data.name}" has been updated.` });
      fetchPageData();
      setEditingSavingGoal(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not update saving goal.", variant: "destructive" });
    }
  };

  const handleEdit = (goal: SavingGoal) => {
    setEditingSavingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = async (goalId: string) => {
    if(!user) return;
    try {
      await deleteSavingGoalDoc(user.uid, goalId);
      toast({ title: "Saving Goal Deleted", description: "The saving goal has been removed.", variant: "destructive" });
      fetchPageData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not delete saving goal.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading saving goals...</p></div>;
  }
  
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
