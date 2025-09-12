"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, ReceiptText, Package, Users, Truck } from "lucide-react"; // Removed Clock icon
import { cn } from "@/lib/utils";
// Removed useAuth import as user.id is no longer used for filtering

interface OverviewStatsCardsProps {
  totalRevenue: number;
  totalPurchaseSpending: number;
  totalExpenses: number;
  netProfit: number;
  salesToday: number; // New KPI
  purchasesToday: number; // New KPI
  lowStockAlerts: number; // New KPI
  customerReceivables: number; // New KPI
  supplierPayables: number; // New KPI
  onCardClick: (type: 'sales' | 'purchases' | 'reset') => void;
  showSales: boolean;
  showPurchases: boolean;
}

export function OverviewStatsCards({ 
  totalRevenue, 
  totalPurchaseSpending, 
  totalExpenses, 
  netProfit, 
  salesToday, // Destructure new KPIs
  purchasesToday, // Destructure new KPIs
  lowStockAlerts, // Destructure new KPIs
  customerReceivables, // Destructure new KPIs
  supplierPayables, // Destructure new KPIs
  onCardClick, 
  showSales, 
  showPurchases 
}: OverviewStatsCardsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200",
          !showSales && "opacity-50 border-dashed"
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
          !showPurchases && "opacity-50 border-dashed"
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
          (showSales && showPurchases) ? "border-primary ring-2 ring-primary/50" : ""
        )}
        onClick={() => onCardClick('reset')}
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
          (showSales && showPurchases) ? "border-primary ring-2 ring-primary/50" : ""
        )}
        onClick={() => onCardClick('reset')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/20 text-chart-4"><DollarSign className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(netProfit)}</div></CardContent>
      </Card>

      {/* New KPI Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 text-green-600"><TrendingUp className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(salesToday)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Purchases Today</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600"><ShoppingCart className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(purchasesToday)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-600"><Package className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{lowStockAlerts}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customer Receivables</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600"><Users className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(customerReceivables)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Supplier Payables</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-600"><Truck className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(supplierPayables)}</div></CardContent>
      </Card>
    </div>
  );
}