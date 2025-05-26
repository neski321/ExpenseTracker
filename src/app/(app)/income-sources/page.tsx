
"use client";

import React, { useState, useEffect } from "react";
import { IncomeSourceForm } from "@/components/income-sources/income-source-form";
import { IncomeSourceList } from "@/components/income-sources/income-source-list";
import type { IncomeSource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Briefcase } from "lucide-react";
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
import { initialIncomeSourcesData, initialIncomesData } from "@/lib/mock-data"; // Added initialIncomesData

export default function IncomeSourcesPage() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | undefined>(undefined);
  const { toast } = useToast();

  const refreshIncomeSourcesState = React.useCallback(() => {
    setIncomeSources([...initialIncomeSourcesData]);
  }, [initialIncomeSourcesData]);

  useEffect(() => {
    refreshIncomeSourcesState();
  }, [refreshIncomeSourcesState, initialIncomeSourcesData]); // Ensure initialIncomeSourcesData is a dependency

  const handleAddIncomeSource = (data: Omit<IncomeSource, "id" | "iconName">) => {
    const newIncomeSource = { 
        ...data, 
        id: `is${Date.now()}`, // Use Date.now() for better uniqueness
        iconName: undefined, 
    };
    initialIncomeSourcesData.push(newIncomeSource);
    refreshIncomeSourcesState();
    setIsFormOpen(false);
  };

  const handleUpdateIncomeSource = (data: Omit<IncomeSource, "id" | "iconName">) => {
    if (!editingIncomeSource) return;
    const indexInGlobal = initialIncomeSourcesData.findIndex(is => is.id === editingIncomeSource.id);
    if (indexInGlobal !== -1) {
      initialIncomeSourcesData[indexInGlobal] = { 
        ...initialIncomeSourcesData[indexInGlobal], 
        name: data.name 
        // iconName will be preserved from original if not editable in form
      };
    }
    refreshIncomeSourcesState();
    setEditingIncomeSource(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (incomeSource: IncomeSource) => {
    setEditingIncomeSource(incomeSource);
    setIsFormOpen(true);
  };

  const handleDelete = (incomeSourceId: string) => {
    const isUsedInIncomes = initialIncomesData.some(inc => inc.incomeSourceId === incomeSourceId);
    if (isUsedInIncomes) {
      toast({
        title: "Cannot Delete Income Source",
        description: "This income source is currently used by one or more income entries. Please reassign those entries first.",
        variant: "destructive",
      });
      return;
    }
    
    const indexInGlobal = initialIncomeSourcesData.findIndex(is => is.id === incomeSourceId);
    if (indexInGlobal !== -1) {
      initialIncomeSourcesData.splice(indexInGlobal, 1);
    }
    refreshIncomeSourcesState();
    toast({
      title: "Income Source Deleted",
      description: "The income source has been removed successfully.",
      variant: "destructive"
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
              <Briefcase className="mr-3 h-7 w-7 text-primary" />
              Manage Income Sources
            </CardTitle>
            <CardDescription>Define where your income comes from (e.g., Salary, Freelance).</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingIncomeSource(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingIncomeSource ? "Edit Source" : "Add New Source"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingIncomeSource ? "Edit Income Source" : "Add New Income Source"}</DialogTitle>
                    <DialogDescription>
                    {editingIncomeSource ? "Update the details of this income source." : "Create a new source for your income."}
                    </DialogDescription>
                </DialogHeader>
                <IncomeSourceForm 
                    onSubmit={editingIncomeSource ? handleUpdateIncomeSource : handleAddIncomeSource}
                    existingIncomeSource={editingIncomeSource}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <IncomeSourceList 
            incomeSources={incomeSources} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

    