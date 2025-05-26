
"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethodForm } from "@/components/payment-methods/payment-method-form";
import { PaymentMethodList } from "@/components/payment-methods/payment-method-list";
import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, CreditCard } from "lucide-react";
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
import { initialPaymentMethodsData, initialExpensesData } from "@/lib/mock-data"; // Added initialExpensesData

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const { toast } = useToast();

  const refreshPaymentMethodsState = React.useCallback(() => {
    setPaymentMethods([...initialPaymentMethodsData]);
  }, [initialPaymentMethodsData]);

  useEffect(() => {
    refreshPaymentMethodsState();
  }, [refreshPaymentMethodsState, initialPaymentMethodsData]); // Ensure initialPaymentMethodsData is a dependency

  const handleAddPaymentMethod = (data: Omit<PaymentMethod, "id">) => {
    const newPaymentMethod = { 
        ...data, 
        id: `pm${Date.now()}`, // Use Date.now() for better uniqueness
    };
    initialPaymentMethodsData.push(newPaymentMethod);
    refreshPaymentMethodsState();
    setIsFormOpen(false);
  };

  const handleUpdatePaymentMethod = (data: Omit<PaymentMethod, "id">) => {
    if (!editingPaymentMethod) return;
    const indexInGlobal = initialPaymentMethodsData.findIndex(pm => pm.id === editingPaymentMethod.id);
    if (indexInGlobal !== -1) {
      initialPaymentMethodsData[indexInGlobal] = { 
        ...initialPaymentMethodsData[indexInGlobal], 
        name: data.name 
      };
    }
    refreshPaymentMethodsState();
    setEditingPaymentMethod(undefined);
    setIsFormOpen(false);
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setIsFormOpen(true);
  };

  const handleDelete = (paymentMethodId: string) => {
    const isUsedInExpenses = initialExpensesData.some(exp => exp.paymentMethodId === paymentMethodId);
     if (isUsedInExpenses) {
      toast({
        title: "Cannot Delete Payment Method",
        description: "This payment method is currently used by one or more expenses. Please reassign those expenses first.",
        variant: "destructive",
      });
      return;
    }

    const indexInGlobal = initialPaymentMethodsData.findIndex(pm => pm.id === paymentMethodId);
    if (indexInGlobal !== -1) {
      initialPaymentMethodsData.splice(indexInGlobal, 1);
    }
    refreshPaymentMethodsState();
    toast({
      title: "Payment Method Deleted",
      description: "The payment method has been removed successfully.",
      variant: "destructive"
    });
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center">
              <CreditCard className="mr-3 h-7 w-7 text-primary" />
              Manage Payment Methods
            </CardTitle>
            <CardDescription>Add, edit, or remove your payment methods.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingPaymentMethod(undefined);
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-md">
                <PlusCircle className="mr-2 h-4 w-4" /> {editingPaymentMethod ? "Edit Method" : "Add New Method"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingPaymentMethod ? "Edit Payment Method" : "Add New Payment Method"}</DialogTitle>
                    <DialogDescription>
                    {editingPaymentMethod ? "Update the details of this payment method." : "Enter the details for a new payment method."}
                    </DialogDescription>
                </DialogHeader>
                <PaymentMethodForm 
                    onSubmit={editingPaymentMethod ? handleUpdatePaymentMethod : handleAddPaymentMethod}
                    existingPaymentMethod={editingPaymentMethod}
                />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <PaymentMethodList 
            paymentMethods={paymentMethods} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

    