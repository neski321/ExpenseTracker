"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Income, IncomeSource, Currency } from "@/lib/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/lib/currency-utils";
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

interface IncomeListProps {
  incomes: Income[];
  incomeSources: IncomeSource[];
  currencies: Currency[];
  onEdit: (income: Income) => void;
  onDelete: (incomeId: string) => void;
}

export function IncomeList({ incomes, incomeSources, currencies, onEdit, onDelete }: IncomeListProps) {
  const getIncomeSourceName = (sourceId: string) => {
    return incomeSources.find(src => src.id === sourceId)?.name || "Unknown Source";
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (incomes.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No income recorded yet. Start by adding one!</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.filter(income => {
            if (income.id === undefined || income.id === null || income.id === '') {
              console.warn('Income entry missing id:', income);
              return false;
            }
            return true;
          }).map((income, index) => (
            <TableRow key={income.id || index} className="group hover:bg-muted/50 transition-colors">
              <TableCell>{format(new Date(income.date), "PP")}</TableCell>
              <TableCell>
                <Link href={`/income/source/${income.incomeSourceId}?from=income`} className="block group/source">
                  <Badge variant="secondary" className="group-hover/source:bg-primary group-hover/source:text-primary-foreground transition-colors cursor-pointer">
                    {getIncomeSourceName(income.incomeSourceId)}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell className="text-right">
                {getCurrencySymbol(income.currencyId, currencies)}{income.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center space-x-1 sm:space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(income)} aria-label="Edit income">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog open={confirmId === income.id} onOpenChange={open => setConfirmId(open ? income.id : null)}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmId(income.id)} aria-label="Delete income" className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Income</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this income entry? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(income.id)}
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
