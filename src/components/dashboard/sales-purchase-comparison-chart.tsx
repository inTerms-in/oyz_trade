"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

interface SalesPurchaseComparisonChartProps {
  data: { month: string; sales: number; purchases: number }[];
  showSales: boolean; // New prop
  showPurchases: boolean; // New prop
}

export function SalesPurchaseComparisonChart({ data, showSales, showPurchases }: SalesPurchaseComparisonChartProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Sales vs. Purchases</CardTitle>
        <CardDescription>Comparison of total sales revenue and purchase spending per month.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(str) => format(parseISO(str), "MMM")}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `₹${value}`}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Month: ${format(parseISO(label), "MMM")}`}
                />
                <Legend />
                {showSales && (
                  <Bar dataKey="sales" name="Sales Revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                )}
                {showPurchases && (
                  <Bar dataKey="purchases" name="Purchase Spending" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Not enough data to display monthly comparison.
          </div>
        )}
      </CardContent>
    </Card>
  );
}