import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Tag } from "lucide-react";

interface StatsCardsProps {
  totalSpent: number;
  totalPurchases: number;
  totalItems: number;
}

export function StatsCards({ totalSpent, totalPurchases, totalItems }: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/20 text-chart-1">
            <DollarSign className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/20 text-chart-2">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{totalPurchases}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items Tracked</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/20 text-chart-4">
            <Tag className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
        </CardContent>
      </Card>
    </div>
  );
}