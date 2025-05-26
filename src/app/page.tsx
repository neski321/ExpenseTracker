import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';

export default function LandingPage() {
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
        <Link href="/dashboard">Get Started</Link>
      </Button>
      <footer className="absolute bottom-8 text-sm text-muted-foreground">
        © {new Date().getFullYear()} PennyPincher. All rights reserved.
      </footer>
    </div>
  );
}
