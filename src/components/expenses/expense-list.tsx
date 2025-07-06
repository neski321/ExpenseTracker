"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Expense, Category, PaymentMethod, Currency } from "@/lib/types"; 
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Repeat } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/lib/currency-utils"; 
import { getCategoryNameWithHierarchy } from "@/lib/category-utils";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[]; 
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  sourcePageIdentifier?: 'expenses' | 'search' | 'overview' | 'category' | 'payment-method'; 
}

export function ExpenseList({ expenses, categories, paymentMethods, currencies, onEdit, onDelete, sourcePageIdentifier }: ExpenseListProps) {
  const getCategoryDisplay = (categoryId: string) => {
    return getCategoryNameWithHierarchy(categoryId, categories) || "Uncategorized";
  };

  const getPaymentMethodName = (paymentMethodId?: string) => {
    if (!paymentMethodId) return "N/A";
    return paymentMethods.find(pm => pm.id === paymentMethodId)?.name || "Unknown Method";
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No expenses recorded yet. Start by adding one!</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Payment Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{format(new Date(expense.date), "PP")}</TableCell>
              <TableCell>
                <div className="font-medium">{expense.description}</div>
                {expense.isSubscription && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Repeat className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span>
                      Subscription (Next due: {expense.nextDueDate ? format(new Date(expense.nextDueDate), "PP") : 'N/A'})
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Link 
                  href={`/expenses/category/${expense.categoryId}${sourcePageIdentifier ? `?from=${sourcePageIdentifier}` : ''}`} 
                  className="group inline-block"
                >
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "cursor-pointer transition-colors",
                      "group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/50"
                    )}
                  >
                    {getCategoryDisplay(expense.categoryId)}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell>
                 <div className="flex items-center text-sm">
                    {expense.paymentMethodId ? (
                        <Link 
                            href={`/expenses/payment-method/${expense.paymentMethodId}${sourcePageIdentifier ? `?from=${sourcePageIdentifier}` : ''}`}
                            className="hover:underline hover:text-primary transition-colors"
                        >
                            {getPaymentMethodName(expense.paymentMethodId)}
                        </Link>
                    ) : (
                        getPaymentMethodName(expense.paymentMethodId)
                    )}
                 </div>
              </TableCell>
              <TableCell className="text-right">
                {getCurrencySymbol(expense.currencyId, currencies)}{expense.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center space-x-1 sm:space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} aria-label="Edit expense">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog open={confirmId === expense.id} onOpenChange={open => setConfirmId(open ? expense.id : null)}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmId(expense.id)} aria-label="Delete expense" className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this expense? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(expense.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
