"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import GaugeChart from 'react-gauge-chart';

interface StockHealthGaugeProps {
  totalItems: number;
  itemsInStock: number;
}

export function StockHealthGauge({ totalItems, itemsInStock }: StockHealthGaugeProps) {
  const percentage = totalItems > 0 ? (itemsInStock / totalItems) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Health</CardTitle>
        <CardDescription>Percentage of items currently in stock.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-[300px]">
        {totalItems > 0 ? (
          <>
            <GaugeChart
              id="stock-health-gauge"
              nrOfLevels={3}
              arcsLength={[0.3, 0.4, 0.3]}
              colors={['#EA4228', '#F5CD19', '#5BE12C']}
              percent={percentage}
              arcPadding={0.02}
              cornerRadius={3}
              needleColor="#345243"
              needleBaseColor="#345243"
              hideText={true}
            />
            <div className="text-center mt-4">
              <p className="text-4xl font-bold">{Math.round(percentage * 100)}%</p>
              <p className="text-muted-foreground text-sm">
                {itemsInStock} out of {totalItems} items in stock
              </p>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No items to track stock health.
          </div>
        )}
      </CardContent>
    </Card>
  );
}