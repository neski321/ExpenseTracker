
"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Coins, Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const { user, logOut } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await logOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Router redirection is handled by AuthContext or AppLayout
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
      <SidebarTrigger className="sm:hidden" />
      <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-primary">
        <Coins className="h-6 w-6" />
        <span className="hidden sm:inline-block">PennyPincher</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {mounted && (
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}
        {user && (
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </header>
  );
}
