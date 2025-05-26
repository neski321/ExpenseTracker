
import type { LucideIcon } from "lucide-react";
import Link from "next/link"; // Import Link
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  href?: string; // Added href prop
}

export function StatCard({ title, value, description, icon: Icon, className, iconClassName, href }: StatCardProps) {
  const cardInnerContent = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full group"> {/* Added group for potential hover effects on Card */}
        <Card className={cn("shadow-lg group-hover:shadow-xl transition-shadow duration-300 h-full", className)}>
          {cardInnerContent}
        </Card>
      </Link>
    );
  }

  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-shadow duration-300 h-full", className)}>
      {cardInnerContent}
    </Card>
  );
}
