
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import type { Expense, Currency, ExchangeRate } from "@/lib/types";
import { convertToBaseCurrency } from "@/lib/currency-utils";
import { getMonth, getYear, format, isValid } from "date-fns"; // Added format and isValid

interface SpendingOverviewChartProps {
  expenses: Expense[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
}

const chartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function SpendingOverviewChart({ expenses, currencies, exchangeRates }: SpendingOverviewChartProps) {
  const router = useRouter();
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const now = new Date();
    const dynamicMonthsConfig = [];
    for (let i = 5; i >= 0; i--) { // Generate last 6 months including current, sorted chronologically
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      dynamicMonthsConfig.push({
        monthName: format(targetDate, "MMMM"),
        month: getMonth(targetDate),
        year: getYear(targetDate),
        // spending will be calculated next
      });
    }

    const newChartData = dynamicMonthsConfig.map(monthData => {
      const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        if (!isValid(expenseDate)) return false; // Skip invalid dates
        return getMonth(expenseDate) === monthData.month && getYear(expenseDate) === monthData.year;
      });

      const totalSpendingForMonth = monthlyExpenses.reduce((sum, expenseItem) => { // Renamed expense to expenseItem to avoid conflict
        return sum + convertToBaseCurrency(expenseItem.amount, expenseItem.currencyId, exchangeRates);
      }, 0);

      return { ...monthData, spending: parseFloat(totalSpendingForMonth.toFixed(2)) };
    });
    setChartData(newChartData);

  }, [expenses, currencies, exchangeRates]);

  const handleBarClick = (data: any, index: number, event: React.MouseEvent<SVGPathElement>) => {
    const clickedBarData = data; 
    if (clickedBarData && clickedBarData.year !== undefined && clickedBarData.month !== undefined) {
      router.push(`/expenses/overview/${clickedBarData.year}/${clickedBarData.month + 1}`);
    }
  };

  const hasSpendingData = useMemo(() => chartData.some(d => d.spending > 0), [chartData]);

  if (!hasSpendingData) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>Your spending trends over the last few months. Click a month for details.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No spending data available for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Spending Overview</CardTitle>
        <CardDescription>Your spending trends over the last few months. Click a month for details.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis dataKey="monthName" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="spending" fill="var(--color-spending)" radius={4} onClick={handleBarClick} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
