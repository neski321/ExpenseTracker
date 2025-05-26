
"use client";

import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CreditCard } from "lucide-react"; // Default icon
import { Card, CardContent } from "@/components/ui/card";

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  onEdit: (paymentMethod: PaymentMethod) => void;
  onDelete: (paymentMethodId: string) => void;
}

export function PaymentMethodList({ paymentMethods, onEdit, onDelete }: PaymentMethodListProps) {

  if (paymentMethods.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No payment methods found. Add one to get started!</p>;
  }

  return (
    <div className="space-y-3">
      {paymentMethods.map((method) => (
        <Card key={method.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" /> {/* Placeholder icon */}
              <span className="font-medium">{method.name}</span>
              {/* Future: Display type (Card, Bank, Cash) */}
            </div>
            <div className="space-x-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(method)} aria-label={`Edit payment method ${method.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(method.id)} 
                aria-label={`Delete payment method ${method.name}`}
                className="text-destructive hover:text-destructive/80"
                // TODO: Add disabled logic if method is in use
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
