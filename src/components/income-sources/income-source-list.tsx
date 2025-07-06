"use client";

import type { IncomeSource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Briefcase } from "lucide-react"; // Default icon
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

interface IncomeSourceListProps {
  incomeSources: IncomeSource[];
  onEdit: (incomeSource: IncomeSource) => void;
  onDelete: (incomeSourceId: string) => void;
}

export function IncomeSourceList({ incomeSources, onEdit, onDelete }: IncomeSourceListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (incomeSources.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No income sources found. Add one to get started!</p>;
  }

  return (
    <div className="space-y-3">
      {incomeSources.map((source) => {
        const IconComponent = Briefcase;
        return (
          <Link href={`/income/source/${source.id}?from=income-sources`} key={source.id} className="block group" aria-label={`View income from ${source.name}`}>
            <Card className="shadow-sm hover:shadow-md transition-shadow group-hover:shadow-lg">
              <CardContent className="p-4 flex items-center justify-between group-hover:text-primary transition-colors">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-primary flex-shrink-0 group-hover:text-primary/80 transition-colors" />
                  <span className="font-medium">{source.name}</span>
                </div>
                <div className="space-x-1 relative z-20">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(source); }}
                    aria-label={`Edit income source ${source.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog open={confirmId === source.id} onOpenChange={open => setConfirmId(open ? source.id : null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmId(source.id); }} 
                        aria-label={`Delete income source ${source.name}`}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Income Source</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this income source? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(source.id)}
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
        );
      })}
    </div>
  );
}
