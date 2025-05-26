
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Tags,
  Coins,
  Settings,
  CreditCard, 
  Search, 
  Briefcase, // For Income Sources
  DollarSign, // For Income
  PiggyBank, // For Savings Goals
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", tooltip: "Dashboard" },
  { href: "/expenses", icon: ReceiptText, label: "Expenses", tooltip: "Manage Expenses" },
  { href: "/expenses/search", icon: Search, label: "Search Expenses", tooltip: "Search & Filter Expenses"}, 
  { href: "/income", icon: DollarSign, label: "Income", tooltip: "Manage Income"},
  { href: "/budgets", icon: Target, label: "Budgets", tooltip: "Budgets" },
  { href: "/savings-goals", icon: PiggyBank, label: "Savings Goals", tooltip: "Manage Savings Goals" },
  { href: "/categories", icon: Tags, label: "Categories", tooltip: "Expense Categories" },
  { href: "/income-sources", icon: Briefcase, label: "Income Sources", tooltip: "Income Sources"},
  { href: "/payment-methods", icon: CreditCard, label: "Payment Methods", tooltip: "Payment Methods" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="p-4 justify-center">
        <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
          <Coins className="h-7 w-7 transition-transform duration-300 ease-in-out group-hover:rotate-[360deg]" />
          PennyPincher
        </Link>
         <Coins className="h-7 w-7 text-primary hidden group-data-[collapsible=icon]:block" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))} 
                tooltip={{ children: item.tooltip, className: "bg-card text-card-foreground border-border shadow-md" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: "Settings", className: "bg-card text-card-foreground border-border shadow-md" }} isActive={pathname === "/settings"}>
              <Link href="/settings"> 
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

