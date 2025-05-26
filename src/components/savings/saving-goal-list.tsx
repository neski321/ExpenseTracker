
"use client";

import type { SavingGoal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, PiggyBank, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SavingGoalListProps {
  goals: SavingGoal[];
  baseCurrencySymbol: string;
  onEdit: (goal: SavingGoal) => void;
  onDelete: (goalId: string) => void;
}

export function SavingGoalList({ goals, baseCurrencySymbol, onEdit, onDelete }: SavingGoalListProps) {
  
  if (goals.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No saving goals set yet. Create one to start tracking!</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => {
        const progressPercent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        const IconComponent = goal.icon || HelpCircle; // Default icon if none specified
        const isCompleted = goal.currentAmount >= goal.targetAmount;

        return (
          <Card key={goal.id} className={cn("shadow-md hover:shadow-lg transition-shadow flex flex-col", isCompleted && "border-green-500 dark:border-green-400")}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-7 w-7 text-primary" />
                  <CardTitle className="text-lg">{goal.name}</CardTitle>
                </div>
                <div className="space-x-1"> 
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onEdit(goal)} 
                    aria-label={`Edit goal ${goal.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(goal.id)} 
                    aria-label={`Delete goal ${goal.name}`}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {goal.notes && (
                <CardDescription className="text-xs pt-1 italic">{goal.notes}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>
                    Saved: {baseCurrencySymbol}{goal.currentAmount.toFixed(2)}
                  </span>
                  <span>
                    Target: {baseCurrencySymbol}{goal.targetAmount.toFixed(2)}
                  </span>
                </div>
                <Progress value={progressPercent} className={cn("h-3", isCompleted && "bg-green-500 [&>div]:bg-green-600 dark:[&>div]:bg-green-500")} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{progressPercent.toFixed(0)}%</span>
                    {goal.targetDate && (
                    <span>Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
                    )}
                </div>
              </div>
               {isCompleted && (
                <p className="text-sm font-semibold text-green-600 dark:text-green-500 mt-3 text-center">Goal Achieved! 🎉</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
