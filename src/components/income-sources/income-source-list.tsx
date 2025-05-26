
"use client";

import type { IncomeSource } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Briefcase } from "lucide-react"; // Default icon
import { Card, CardContent } from "@/components/ui/card";

interface IncomeSourceListProps {
  incomeSources: IncomeSource[];
  onEdit: (incomeSource: IncomeSource) => void;
  onDelete: (incomeSourceId: string) => void;
}

export function IncomeSourceList({ incomeSources, onEdit, onDelete }: IncomeSourceListProps) {

  if (incomeSources.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No income sources found. Add one to get started!</p>;
  }

  return (
    <div className="space-y-3">
      {incomeSources.map((source) => {
        const IconComponent = source.icon || Briefcase;
        return (
          <Card key={source.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconComponent className="h-5 w-5 text-primary" />
                <span className="font-medium">{source.name}</span>
              </div>
              <div className="space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(source)} aria-label={`Edit income source ${source.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDelete(source.id)} 
                  aria-label={`Delete income source ${source.name}`}
                  className="text-destructive hover:text-destructive/80"
                  // TODO: Disable if source is in use by income entries
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
