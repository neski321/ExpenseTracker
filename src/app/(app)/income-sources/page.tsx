
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import {
  addIncomeSourceDoc,
  getIncomeSourcesCol,
  updateIncomeSourceDoc,
  deleteIncomeSourceDoc,
} from "@/lib/services/income-source-service";

export default function IncomeSourcesPage() {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | undefined>(undefined);
  const { toast } = useToast();

  const fetchIncomeSources = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userIncomeSources = await getIncomeSourcesCol(user.uid);
      setIncomeSources(userIncomeSources);
    } catch (error) {
      console.error("Failed to fetch income sources:", error);
      toast({ title: "Error", description: "Could not load income sources.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchIncomeSources();
  }, [fetchIncomeSources]);

  const handleAddIncomeSource = async (data: Omit<IncomeSource, "id" | "iconName">) => {
    if (!user) return;
    const incomeSourceData: Omit<IncomeSource, "id"> = { ...data, iconName: undefined }; // Form doesn't handle icons yet
    try {
      await addIncomeSourceDoc(user.uid, incomeSourceData);
      toast({ title: "Income Source Added!", description: `Source "${data.name}" has been successfully added.` });
      fetchIncomeSources();
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error adding source", description: error.message || "Could not add income source.", variant: "destructive" });
    }
  };

  const handleUpdateIncomeSource = async (data: Omit<IncomeSource, "id" | "iconName">) => {
    if (!user || !editingIncomeSource) return;
    const updateData: Partial<Omit<IncomeSource, "id">> = { 
        name: data.name, 
        iconName: editingIncomeSource.iconName // Preserve existing icon
    };
    try {
      await updateIncomeSourceDoc(user.uid, editingIncomeSource.id, updateData);
      toast({ title: "Income Source Updated!", description: `Source "${data.name}" has been successfully updated.` });
      fetchIncomeSources();
      setEditingIncomeSource(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error updating source", description: error.message || "Could not update income source.", variant: "destructive" });
    }
  };

  const handleEdit = (incomeSource: IncomeSource) => {
    setEditingIncomeSource(incomeSource);
    setIsFormOpen(true);
  };

  const handleDelete = async (incomeSourceId: string) => {
    if (!user) return;
    try {
      await deleteIncomeSourceDoc(user.uid, incomeSourceId);
      toast({ title: "Income Source Deleted", description: "The income source has been removed.", variant: "destructive" });
      fetchIncomeSources();
    } catch (error: any) {
      toast({
        title: "Cannot Delete Source",
        description: error.message || "Could not delete income source.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading income sources...</p></div>;
  }

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
            <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
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
