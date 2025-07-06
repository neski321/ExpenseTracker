"use client";

import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CreditCard } from "lucide-react"; // Default icon
import { Card, CardContent } from "@/components/ui/card";
import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  onEdit: (paymentMethod: PaymentMethod) => void;
  onDelete: (paymentMethodId: string) => void;
}

export function PaymentMethodList({ paymentMethods, onEdit, onDelete }: PaymentMethodListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (paymentMethods.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No payment methods found. Add one to get started!</p>;
  }

  return (
    <div className="space-y-3">
      {paymentMethods.map((method) => (
        <Link href={`/expenses/payment-method/${method.id}?from=payment-methods`} key={method.id} className="block group" aria-label={`View expenses paid with ${method.name}`}>
          <Card className="shadow-sm hover:shadow-md transition-shadow group-hover:shadow-lg">
            <CardContent className="p-4 flex items-center justify-between group-hover:text-primary transition-colors">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary flex-shrink-0 group-hover:text-primary/80 transition-colors" /> {/* Placeholder icon */}
                <span className="font-medium">{method.name}</span>
                {/* Future: Display type (Card, Bank, Cash) */}
              </div>
              <div className="space-x-1 relative z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(method); }}
                  aria-label={`Edit payment method ${method.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog open={confirmId === method.id} onOpenChange={open => setConfirmId(open ? method.id : null)}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmId(method.id); }} 
                      aria-label={`Delete payment method ${method.name}`}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this payment method? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(method.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
