
"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import type { Category, Expense, Currency, ExchangeRate } from "@/lib/types";
import { convertToBaseCurrency, getCurrencySymbol, BASE_CURRENCY_ID } from "@/lib/currency-utils";
import { getAllDescendantCategoryIds } from "@/lib/category-utils";

interface SubCategorySpendingChartProps {
  mainCategory: Category;
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
].reverse(); 

export function SubCategorySpendingChart({
  mainCategory,
  allCategories,
  expensesToDisplay, // Use this prop
  allCurrencies,
  allExchangeRates,
}: SubCategorySpendingChartProps) {
  const router = useRouter();
  const baseCurrencySymbol = useMemo(() => getCurrencySymbol(BASE_CURRENCY_ID, allCurrencies), [allCurrencies]);

  const chartData = useMemo(() => {
    const directSubCategories = allCategories.filter(cat => cat.parentId === mainCategory.id);
    
    const data = directSubCategories.map(subCat => {
      const descendantIds = getAllDescendantCategoryIds(subCat.id, allCategories);
      const categoryIdsToConsider = Array.from(new Set([subCat.id, ...descendantIds]));
      
      const totalSpending = expensesToDisplay // Use expensesToDisplay here
        .filter(exp => categoryIdsToConsider.includes(exp.categoryId))
        .reduce((sum, exp) => {
          return sum + convertToBaseCurrency(exp.amount, exp.currencyId, allExchangeRates);
        }, 0);

      return {
        name: subCat.name,
        categoryId: subCat.id,
        spending: parseFloat(totalSpending.toFixed(2)),
      };
    }).filter(d => d.spending > 0) 
      .sort((a,b) => b.spending - a.spending);

    return data;
  }, [mainCategory, allCategories, expensesToDisplay, allExchangeRates]);

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
      router.push(`/expenses/category/${barData.categoryId}?from=sub-overview-chart`);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px]">
        <p className="text-muted-foreground">No spending data for sub-categories of {mainCategory.name} in the selected period.</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
