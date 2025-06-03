
"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import type { Category, Expense, Currency, ExchangeRate } from "@/lib/types";
import { convertToBaseCurrency, getCurrencySymbol, BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { getAllDescendantCategoryIds } from "@/lib/category-utils";

interface MainCategorySpendingChartProps {
  allCategories: Category[];
  expensesToDisplay: Expense[]; // Changed from allExpenses
  allCurrencies: Currency[];
  allExchangeRates: ExchangeRate[];
}

const CHART_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))",
  "hsl(var(--chart-7))", "hsl(var(--chart-8))", "hsl(var(--chart-9))",
  "hsl(var(--chart-10))", "hsl(var(--chart-11))", "hsl(var(--chart-12))",
];

export function MainCategorySpendingChart({
  allCategories,
  expensesToDisplay, // Use this prop
  allCurrencies,
  allExchangeRates,
}: MainCategorySpendingChartProps) {
  const router = useRouter();
  const baseCurrencySymbol = useMemo(() => getCurrencySymbol(BASE_CURRENCY_ID, allCurrencies), [allCurrencies]);

  const chartData = useMemo(() => {
    const mainCategories = allCategories.filter(cat => !cat.parentId);
    const data = mainCategories.map(mainCat => {
      const descendantIds = getAllDescendantCategoryIds(mainCat.id, allCategories);
      const categoryIdsToConsider = Array.from(new Set([mainCat.id, ...descendantIds]));
      
      const totalSpending = expensesToDisplay // Use expensesToDisplay here
        .filter(exp => categoryIdsToConsider.includes(exp.categoryId))
        .reduce((sum, exp) => {
          return sum + convertToBaseCurrency(exp.amount, exp.currencyId, allExchangeRates);
        }, 0);

      return {
        name: mainCat.name,
        categoryId: mainCat.id,
        spending: parseFloat(totalSpending.toFixed(2)),
        hasSubCategories: allCategories.some(c => c.parentId === mainCat.id),
      };
    }).filter(d => d.spending > 0) 
      .sort((a,b) => b.spending - a.spending); 

    return data;
  }, [allCategories, expensesToDisplay, allExchangeRates]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  const handleBarClick = (barData: any) => { 
    if (barData && barData.categoryId) {
      if (barData.hasSubCategories) {
        router.push(`/categories/${barData.categoryId}/sub-overview`);
      } else {
        router.push(`/expenses/category/${barData.categoryId}?from=categories-chart`);
      }
    }
  };
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">No spending data available for selected period.</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `${baseCurrencySymbol}${value}`} />
          <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tick={{ width: 100 }} width={100} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="spending" layout="vertical" radius={4} onClick={(data) => handleBarClick(data)} cursor="pointer">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
