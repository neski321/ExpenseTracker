
"use client"; // This layout needs to be a client component to use hooks

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Coins } from "lucide-react"; // For loading state

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Coins className="w-20 h-20 text-primary animate-spin mb-6" />
        <p className="text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be caught by the useEffect redirect,
    // but it's a fallback. Or show a minimal "redirecting" UI.
    return null; 
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
