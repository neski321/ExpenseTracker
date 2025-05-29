
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import type { Category, Expense, Currency, ExchangeRate } from "@/lib/types";
import { convertToBaseCurrency } from "@/lib/currency-utils";
import { getAllDescendantCategoryIds } from "@/lib/category-utils";

interface CategorySpendingChartProps {
  categories: Category[];
  expenses: Expense[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
}

// Extended predefined colors from globals.css
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
  "hsl(var(--chart-11))",
  "hsl(var(--chart-12))",
];

export function CategorySpendingChart({
  categories,
  expenses,
  currencies,
  exchangeRates,
}: CategorySpendingChartProps) {
  const router = useRouter();
  const [chartData, setChartData] = useState<any[]>([]);
  const [dynamicChartConfig, setDynamicChartConfig] = useState<ChartConfig>({});

  useEffect(() => {
    if (!categories.length || !currencies.length || !exchangeRates.length) { // Expenses can be empty
      setChartData([]);
      setDynamicChartConfig({});
      return;
    }

    const parentCategories = categories.filter(cat => !cat.parentId);
    const newChartData: any[] = [];
    const newConfig: ChartConfig = {};
    let colorIndex = 0;

    parentCategories.forEach(parentCat => {
      const descendantIds = getAllDescendantCategoryIds(parentCat.id, categories);
      const categoryIdsToConsider = Array.from(new Set([parentCat.id, ...descendantIds]));

      const totalSpentInBase = expenses
        .filter(exp => categoryIdsToConsider.includes(exp.categoryId))
        .reduce((sum, exp) => {
          return sum + convertToBaseCurrency(exp.amount, exp.currencyId, exchangeRates);
        }, 0);

      if (totalSpentInBase > 0) {
        const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
        newChartData.push({
          name: parentCat.name,
          categoryId: parentCat.id,
          value: parseFloat(totalSpentInBase.toFixed(2)), 
          fill: color,
        });
        newConfig[parentCat.name] = { label: parentCat.name, color: color };
        colorIndex++;
      }
    });
    
    newChartData.sort((a, b) => b.value - a.value);

    setChartData(newChartData);
    setDynamicChartConfig(newConfig);
  }, [categories, expenses, currencies, exchangeRates]);

  const handlePieClick = (pieSliceData: any) => {
    if (pieSliceData && pieSliceData.categoryId) {
      router.push(`/expenses/category/${pieSliceData.categoryId}?from=dashboard`);
    }
  };

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Breakdown of your expenses.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No spending data to display for categories.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Breakdown of your expenses. Click a category for details.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={dynamicChartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Legend content={({payload}) => {
                if (!payload) return null;
                return (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm text-muted-foreground">
                    {
                      payload.map((entry, index) => (
                        <li key={`item-${index}`} className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: entry.color}} />
                          {entry.value}
                        </li>
                      ))
                    }
                  </ul>
                )
              }}/>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    if (percent * 100 < 5) return null; 
                    return (
                      <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px" fontWeight="medium">
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                onClick={handlePieClick}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
