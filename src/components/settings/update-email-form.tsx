
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
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Mail, KeyRound } from "lucide-react";

const updateEmailFormSchema = z.object({
  newEmail: z.string().email("Please enter a valid new email address."),
  confirmNewEmail: z.string().email("Please confirm your new email address."),
  currentPassword: z.string().min(1, "Current password is required."),
}).refine(data => data.newEmail === data.confirmNewEmail, {
  message: "New emails do not match.",
  path: ["confirmNewEmail"],
});

type UpdateEmailFormValues = z.infer<typeof updateEmailFormSchema>;

export function UpdateEmailForm() {
  const { user, reauthenticateCurrentEmail, updateUserEmail } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UpdateEmailFormValues>({
    resolver: zodResolver(updateEmailFormSchema),
    defaultValues: {
      newEmail: "",
      confirmNewEmail: "",
      currentPassword: "",
    },
  });

  async function onSubmit(data: UpdateEmailFormValues) {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to change your email.", variant: "destructive" });
      return;
    }
    if (data.newEmail === user.email) {
        toast({ title: "Information", description: "The new email address is the same as your current one.", variant: "default" });
        return;
    }

    setIsLoading(true);
    try {
      // Step 1: Re-authenticate user with current password
      await reauthenticateCurrentEmail(data.currentPassword);
      
      // Step 2: If re-authentication is successful, update the email
      await updateUserEmail(data.newEmail);
      
      toast({
        title: "Email Update Initiated",
        description: "Your email address has been successfully updated. You may need to verify your new email address if prompted by Firebase.",
      });
      form.reset(); // Reset form on success
    } catch (error: any) {
      toast({
        title: "Email Update Failed",
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
          name="newEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your.new.email@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Confirm your new email" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your current password" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto shadow-md" disabled={isLoading}>
          {isLoading ? (
            "Updating Email..."
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" /> Update Email Address
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
