"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewStatsCardsProps {
  totalRevenue: number;
  totalPurchaseSpending: number;
  totalExpenses: number;
  netProfit: number;
  onCardClick: (type: 'sales' | 'purchases' | 'reset') => void; // Changed type to 'reset'
  showSales: boolean; // New prop
  showPurchases: boolean; // New prop
}

export function OverviewStatsCards({ totalRevenue, totalPurchaseSpending, totalExpenses, netProfit, onCardClick, showSales, showPurchases }: OverviewStatsCardsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200",
          !showSales && "opacity-50 border-dashed" // Dim and add dashed border if sales are hidden
        )}
        onClick={() => onCardClick('sales')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/20 text-chart-2"><TrendingUp className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent>
      </Card>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200",
          !showPurchases && "opacity-50 border-dashed" // Dim and add dashed border if purchases are hidden
        )}
        onClick={() => onCardClick('purchases')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Purchase Spending</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/20 text-chart-1"><ShoppingCart className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(totalPurchaseSpending)}</div></CardContent>
      </Card>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200",
          (showSales && showPurchases) ? "border-primary ring-2 ring-primary/50" : "" // Highlight if both are shown (default/reset state)
        )}
        onClick={() => onCardClick('reset')} // Reset to show both
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/20 text-chart-5"><ReceiptText className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div></CardContent>
      </Card>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200",
          (showSales && showPurchases) ? "border-primary ring-2 ring-primary/50" : "" // Highlight if both are shown (default/reset state)
        )}
        onClick={() => onCardClick('reset')} // Reset to show both
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/20 text-chart-4"><DollarSign className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(netProfit)}</div></CardContent>
      </Card>
    </div>
  );
}