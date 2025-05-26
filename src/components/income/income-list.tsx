
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

  if (incomes.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No income recorded yet. Start by adding one!</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incomes.map((income) => (
            <TableRow key={income.id}>
              <TableCell>{format(new Date(income.date), "PP")}</TableCell>
              <TableCell>
                <div className="font-medium">{income.description}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{getIncomeSourceName(income.incomeSourceId)}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {getCurrencySymbol(income.currencyId, currencies)}{income.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center space-x-1 sm:space-x-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(income)} aria-label="Edit income">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(income.id)} aria-label="Delete income" className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
