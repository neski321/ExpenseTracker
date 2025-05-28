
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { sendPasswordReset } from "@/lib/firebase-auth"; // Import the new function
import { Mail } from "lucide-react";

const forgotPasswordFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: () => void; // Optional callback on successful email send
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      await sendPasswordReset(data.email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).",
      });
      form.reset();
      onSuccess?.(); // Call onSuccess callback if provided (e.g., to close the dialog)
    } catch (error: any) {
      toast({
        title: "Error Sending Reset Email",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter your account email" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full shadow-md" disabled={isLoading}>
          {isLoading ? (
            "Sending..."
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" /> Send Reset Link
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
