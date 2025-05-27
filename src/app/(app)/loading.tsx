
import { Coins } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Coins className="w-20 h-20 text-primary animate-spin mb-6" />
      <p className="text-lg text-muted-foreground">Loading your financial dashboard...</p>
    </div>
  );
}
