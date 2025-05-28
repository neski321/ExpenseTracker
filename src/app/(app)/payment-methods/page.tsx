
"use client"; // This layout needs to be a client component to use hooks

import React, { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/contexts/auth-context";
import {
  addPaymentMethodDoc,
  getPaymentMethodsCol,
  updatePaymentMethodDoc,
  deletePaymentMethodDoc,
} from "@/lib/services/payment-method-service";

export default function PaymentMethodsPage() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | undefined>(undefined);
  const { toast } = useToast();

  const fetchPaymentMethods = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userPaymentMethods = await getPaymentMethodsCol(user.uid);
      setPaymentMethods(userPaymentMethods);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      toast({ title: "Error", description: "Could not load payment methods.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleAddPaymentMethod = async (data: Omit<PaymentMethod, "id">) => {
    if (!user) return;
    try {
      await addPaymentMethodDoc(user.uid, data);
      toast({ title: "Payment Method Added!", description: `"${data.name}" has been successfully added.` });
      fetchPaymentMethods(); // Refresh list
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Adding Method", description: error.message || "Could not add payment method.", variant: "destructive" });
    }
  };

  const handleUpdatePaymentMethod = async (data: Omit<PaymentMethod, "id">) => {
    if (!user || !editingPaymentMethod) return;
    try {
      await updatePaymentMethodDoc(user.uid, editingPaymentMethod.id, data);
      toast({ title: "Payment Method Updated!", description: `"${data.name}" has been successfully updated.` });
      fetchPaymentMethods(); // Refresh list
      setEditingPaymentMethod(undefined);
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ title: "Error Updating Method", description: error.message || "Could not update payment method.", variant: "destructive" });
    }
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setIsFormOpen(true);
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!user) return;
    try {
      await deletePaymentMethodDoc(user.uid, paymentMethodId);
      toast({ title: "Payment Method Deleted", description: "The payment method has been removed.", variant: "destructive" });
      fetchPaymentMethods(); // Refresh list
    } catch (error: any) {
      toast({
        title: "Cannot Delete Method",
        description: error.message || "Could not delete payment method.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading payment methods...</p></div>;
  }

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
