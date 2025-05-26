
"use client";

import { z as zod } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { SavingGoal } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const savingGoalFormSchema = zod.object({
  name: zod.string().min(2, "Goal name must be at least 2 characters.").max(50),
  targetAmount: zod.coerce.number().positive("Target amount must be positive."),
  currentAmount: zod.coerce.number().min(0, "Current amount cannot be negative."),
  targetDate: zod.date().optional(),
  notes: zod.string().max(200, "Notes cannot exceed 200 characters.").optional(),
  // icon: zod.string().optional(), // For future icon picker
}).refine(data => data.currentAmount <= data.targetAmount, {
  message: "Current amount cannot exceed target amount.",
  path: ["currentAmount"],
});

type SavingGoalFormValues = Omit<SavingGoal, "id" | "icon">;

interface SavingGoalFormProps {
  onSubmit: (data: SavingGoalFormValues) => void;
  existingGoal?: SavingGoal;
  baseCurrencySymbol: string;
}

export function SavingGoalForm({ onSubmit, existingGoal, baseCurrencySymbol }: SavingGoalFormProps) {
  const { toast } = useToast();
  const form = useForm<SavingGoalFormValues>({
    resolver: zodResolver(savingGoalFormSchema),
    defaultValues: existingGoal ? {
      name: existingGoal.name,
      targetAmount: existingGoal.targetAmount,
      currentAmount: existingGoal.currentAmount,
      targetDate: existingGoal.targetDate ? new Date(existingGoal.targetDate) : undefined,
      notes: existingGoal.notes || "",
    } : {
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: undefined,
      notes: "",
    },
  });

  function handleSubmit(data: SavingGoalFormValues) {
    onSubmit(data);
    toast({
      title: existingGoal ? "Saving Goal Updated!" : "Saving Goal Added!",
      description: `Goal "${data.name}" has been successfully ${existingGoal ? 'updated' : 'added'}.`,
    });
    if (!existingGoal) {
      form.reset({
        name: "",
        targetAmount: 0,
        currentAmount: 0,
        targetDate: undefined,
        notes: "",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., New Car, Vacation Fund" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount ({baseCurrencySymbol})</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                      {baseCurrencySymbol}
                    </span>
                    <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Amount ({baseCurrencySymbol})</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                      {baseCurrencySymbol}
                    </span>
                    <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="targetDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Target Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional details about this goal..." {...field} />
              </FormControl>
              <FormDescription>Max 200 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingGoal ? "Update Goal" : "Add Goal"}
        </Button>
      </form>
    </Form>
  );
}
