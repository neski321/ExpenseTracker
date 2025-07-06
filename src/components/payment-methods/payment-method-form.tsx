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
import type { PaymentMethod } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const paymentMethodFormSchema = z.object({
  name: z.string().min(2, "Payment method name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
});

type PaymentMethodFormValues = z.infer<typeof paymentMethodFormSchema>;

interface PaymentMethodFormProps {
  onSubmit: (data: PaymentMethodFormValues) => void;
  existingPaymentMethod?: PaymentMethod; 
}

export function PaymentMethodForm({ onSubmit, existingPaymentMethod }: PaymentMethodFormProps) {
  const { toast } = useToast();
  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: existingPaymentMethod ? {
      name: existingPaymentMethod.name,
    } : {
      name: "",
    },
  });

  // Reset form when existingPaymentMethod changes (for editing)
  useEffect(() => {
    if (existingPaymentMethod) {
      form.reset({
        name: existingPaymentMethod.name,
      });
    } else {
      form.reset({
        name: "",
      });
    }
  }, [existingPaymentMethod, form]);

  function handleSubmit(data: PaymentMethodFormValues) {
    onSubmit(data);
    toast({
      title: existingPaymentMethod ? "Payment Method Updated!" : "Payment Method Added!",
      description: `Payment method "${data.name}" has been successfully ${existingPaymentMethod ? 'updated' : 'added'}.`,
    });
    if (!existingPaymentMethod) {
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
              <FormLabel>Payment Method Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Visa **** 1234, Checking Acct" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Future: Add 'Type' select (Card, Bank, Cash) and 'Details' input */}
        <Button type="submit" className="w-full sm:w-auto shadow-md">
          {existingPaymentMethod ? "Update Method" : "Add Method"}
        </Button>
      </form>
    </Form>
  );
}
