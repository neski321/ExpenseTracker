
import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

// A mapping from string names to LucideIcon components
const iconMap: { [key: string]: LucideIcon } = {
  ShoppingCart: Icons.ShoppingCart,
  Lightbulb: Icons.Lightbulb,
  Film: Icons.Film,
  Car: Icons.Car,
  BriefcaseMedical: Icons.BriefcaseMedical,
  Utensils: Icons.Utensils,
  Tag: Icons.Tag,
  Apple: Icons.Apple,
  Archive: Icons.Archive,
  Egg: Icons.Egg,
  Ticket: Icons.Ticket,
  Youtube: Icons.Youtube,
  Gamepad2: Icons.Gamepad2,
  Zap: Icons.Zap,
  Wifi: Icons.Wifi,
  Droplets: Icons.Droplets,
  Repeat: Icons.Repeat, // For Subscriptions category in mock data
  Briefcase: Icons.Briefcase, // For IncomeSource
  Laptop: Icons.Laptop, // For IncomeSource and SavingGoal
  TrendingUp: Icons.TrendingUp, // For IncomeSource
  Gift: Icons.Gift, // For IncomeSource
  DollarSign: Icons.DollarSign, // For IncomeSource
  Plane: Icons.Plane, // For SavingGoal
  ShieldCheck: Icons.ShieldCheck, // For SavingGoal
  Home: Icons.Home, // For SavingGoal
  HelpCircle: Icons.HelpCircle, // Default for SavingGoal
  Folder: Icons.Folder, // Default for parent categories
  CreditCard: Icons.CreditCard,
  PiggyBank: Icons.PiggyBank,
  Settings: Icons.Settings,
  Search: Icons.Search,
  LayoutDashboard: Icons.LayoutDashboard,
  ReceiptText: Icons.ReceiptText,
  Target: Icons.Target,
  // Add other icons used in your mock data here
};

export const getLucideIcon = (iconName?: string): LucideIcon | undefined => {
  if (!iconName) return undefined;
  return iconMap[iconName];
};

// Helper to get string name from icon component (used for seeding)
export const getIconName = (iconComponent?: LucideIcon): string | undefined => {
  if (!iconComponent) return undefined;
  for (const name in iconMap) {
    if (iconMap[name] === iconComponent) {
      return name;
    }
  }
  return undefined; // Or a default icon name string
};
