
"use client"; // Needs to be client component to use useAuth

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Determine the target for the "Get Started" button
  const getStartedLink = user ? "/dashboard" : "/login";

  useEffect(() => {
    // Optional: if user is logged in and on landing, redirect to dashboard
    // if (!loading && user) {
    //   router.replace('/dashboard');
    // }
  }, [user, loading, router]);

  if (loading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Coins className="w-20 h-20 text-primary animate-spin mb-6" />
        <p className="text-lg text-muted-foreground">Loading PennyPincher...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-8 text-center">
      <Coins className="w-24 h-24 text-primary mb-6" />
      <h1 className="text-5xl font-bold text-primary mb-4">
        PennyPincher
      </h1>
      <p className="text-xl text-foreground/80 mb-8 max-w-md">
        Take control of your finances with ease. Track spending, set budgets, and achieve your financial goals.
      </p>
      <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
        <Link href={getStartedLink}>Get Started</Link>
      </Button>
       {!user && (
        <div className="mt-4">
          <span className="text-sm text-muted-foreground">Already have an account? </span>
          <Button variant="link" asChild className="text-primary">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      )}
      <footer className="absolute bottom-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} PennyPincher. All rights reserved.
      </footer>
    </div>
  );
}
