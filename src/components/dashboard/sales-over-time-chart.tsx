"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";

interface SalesOverTimeChartProps {
  data: { date: string; total: number }[];
}

export function SalesOverTimeChart({ data }: SalesOverTimeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Over Time</CardTitle>
        <CardDescription>Total sales per day for the selected date range.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => format(new Date(str), "MMM d")}
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
                  formatter={(value: number) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "INR",
                    }).format(value)
                  }
                  labelFormatter={(label) => format(new Date(label), "PPP")}
                />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Not enough data to display chart.
          </div>
        )}
      </CardContent>
    </Card>
  );
}