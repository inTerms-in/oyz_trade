"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SalesByHourChartProps {
  data: { hour: number; total_sales: number }[];
}

export function SalesByHourChart({ data }: SalesByHourChartProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(amount);

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 || hour === 24 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Time of Day</CardTitle>
        <CardDescription>Total sales revenue for each hour of the day.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={formatHour}
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
                  labelFormatter={(label) => `Hour: ${formatHour(Number(label))}`}
                />
                <Bar dataKey="total_sales" name="Total Sales" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No sales data to display for time of day.
          </div>
        )}
      </CardContent>
    </Card>
  );
}