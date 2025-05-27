
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";
import { Coins, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
       <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mb-4">
            <Coins className="w-16 h-16 text-primary mx-auto" />
          </Link>
          <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center">
            <UserPlus className="mr-3 h-8 w-8" /> Create Your Account
            </CardTitle>
          <CardDescription>Join PennyPincher and start managing your finances today.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in here
            </Link>
          </p>
        </CardContent>
      </Card>
       <footer className="absolute bottom-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} PennyPincher. All rights reserved.
      </footer>
    </div>
  );
}
