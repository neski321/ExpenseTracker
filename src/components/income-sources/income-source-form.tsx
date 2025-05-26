
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { IncomeSource } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const incomeSourceFormSchema = z.object({
  name: z.string().min(2, "Source name must be at least 2 characters.").max(50),
  // icon: z.string().optional(), // If icon selection is added later
});

type IncomeSourceFormValues = z.infer<typeof incomeSourceFormSchema>;

interface IncomeSourceFormProps {
  onSubmit: (data: IncomeSourceFormValues) => void;
  existingIncomeSource?: IncomeSource;
}

export function IncomeSourceForm({ onSubmit, existingIncomeSource }: IncomeSourceFormProps) {
  const { toast } = useToast();
  const form = useForm<IncomeSourceFormValues>({
    resolver: zodResolver(incomeSourceFormSchema),
    defaultValues: existingIncomeSource ? {
      name: existingIncomeSource.name,
    } : {
      name: "",
    },
  });

  function handleSubmit(data: IncomeSourceFormValues) {
    onSubmit(data);
    toast({
      title: existingIncomeSource ? "Income Source Updated!" : "Income Source Added!",
      description: `Income source "${data.name}" has been successfully ${existingIncomeSource ? 'updated' : 'added'}.`,
    });
    if (!existingIncomeSource) {
      form.reset();
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
              <FormLabel>Source Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Salary, Freelance Project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Icon selection could be added here in the future */}
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingIncomeSource ? "Update Source" : "Add Source"}
        </Button>
      </form>
    </Form>
  );
}
