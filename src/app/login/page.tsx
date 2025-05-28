
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"; // Import new form
import { useAuth } from "@/contexts/auth-context";
import React, { useEffect, useState } from "react"; // Added React for useState
import { Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Import Dialog components

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Coins className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <Link href="/" className="inline-block mb-4">
              <Coins className="w-16 h-16 text-primary mx-auto" />
            </Link>
            <CardTitle className="text-3xl font-bold text-primary">Welcome Back!</CardTitle>
            <CardDescription>Sign in to manage your finances with PennyPincher by neski.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm onForgotPasswordClick={() => setIsForgotPasswordOpen(true)} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up here
              </Link>
            </p>
          </CardContent>
        </Card>
         <footer className="absolute bottom-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} PennyPincher by neski. All rights reserved.
        </footer>
      </div>

      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address below, and we&apos;ll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <ForgotPasswordForm onSuccess={() => setIsForgotPasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
