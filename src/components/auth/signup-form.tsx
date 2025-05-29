
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

const signupFormSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string()
    .min(6, "Password must be at least 6 characters long.")
    .refine(val => !/(012345|123456|234567|345678|456789|567890)/.test(val), {
      message: "Password should not contain common numeric sequences (e.g., '123456')."
    })
    .refine(val => !/(987654|876543|765432|654321|543210|432109)/.test(val), {
      message: "Password should not contain common reverse numeric sequences (e.g., '654321')."
    })
    .refine(val => !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/.test(val.toLowerCase()), {
      message: "Password should not contain common alphabetic sequences (e.g., 'abc')."
    })
    .refine(val => !/(zyx|yxw|xwv|wvu|vut|uts|tsr|srq|rqp|qpo|pon|onm|nml|mlk|lkj|kji|jih|ihg|hgf|gfe|fed|edc|dcb|cba)/.test(val.toLowerCase()), {
      message: "Password should not contain common reverse alphabetic sequences (e.g., 'cba')."
    })
    .refine(val => !/(qwerty|asdfgh|zxcvbn)/.test(val.toLowerCase()), {
      message: "Password should not contain common keyboard patterns (e.g., 'qwerty')."
    })
    .refine(val => !/(.)\1{3,}/.test(val), { // Check for 4 or more identical consecutive characters
      message: "Password should not contain more than three repeated characters (e.g., 'aaaa')."
    }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function SignupForm() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    try {
      await signUp({ email: data.email, password: data.password });
      toast({
        title: "Signup Successful!",
        description: "Your account has been created. Welcome!",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup Failed",
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
                <Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full shadow-md" disabled={isLoading}>
          {isLoading ? (
            "Creating Account..."
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" /> Sign Up
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
