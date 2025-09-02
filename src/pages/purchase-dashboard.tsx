import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseWithItems } from "@/types";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
// Removed useAuth import as user.id is no longer used for filtering

import { Skeleton } from "@/components/ui/skeleton";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { CategorySpendingChart } from "@/components/dashboard/category-spending-chart";
import { RecentPurchases } from "@/components/dashboard/recent-purchases";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { TopItemsChart } from "@/components/dashboard/top-items-chart";
import { RecentPurchaseItems } from "@/components/dashboard/recent-purchase-items";
import { SpendingOverTimeChart } from "@/components/dashboard/spending-over-time-chart";
import { MonthlyPurchasesChart } from "@/components/dashboard/monthly-purchases-chart";

interface CategorySpending {
  name: string;
  value: number;
}

interface TopItem {
    name: string;
    count: number;
}

interface DailyTotal {
  date: string;
  total: number;
}

interface MonthlyTotal {
  month: string;
  total: number;
}

function PurchaseDashboardPage() {
  // Removed user from useAuth destructuring
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<PurchaseWithItems[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [spendingOverTime, setSpendingOverTime] = useState<DailyTotal[]>([]);
  const [monthlyPurchases, setMonthlyPurchases] = useState<MonthlyTotal[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { count, error: itemsError } = await supabase
      .from("ItemMaster")
      .select('*', { count: 'exact', head: true });
    
    if (itemsError) toast.error("Failed to fetch item count", { description: itemsError.message });
    else setTotalItems(count || 0);

    let query = supabase
      .from("Purchase")
      .select("*, PurchaseItem(*, ItemMaster(*, CategoryMaster(*))), SupplierMaster(SupplierName)")
      .order("PurchaseDate", { ascending: false });

    if (dateRange?.from) query = query.gte("PurchaseDate", dateRange.from.toISOString());
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("PurchaseDate", toDate.toISOString());
    }

    const { data: purchases, error: purchasesError } = await query;

    if (purchasesError) {
      toast.error("Failed to fetch purchase data", { description: purchasesError.message });
      setLoading(false);
      return;
    }

    const typedPurchases = purchases as PurchaseWithItems[];
    
    const total = typedPurchases.reduce((acc, p) => acc + p.TotalAmount, 0);
    setTotalSpent(total);
    setTotalPurchases(typedPurchases.length);
    setRecentPurchases(typedPurchases.slice(0, 10));

    const spendingMap: { [key: string]: number } = {};
    const dailySpending: { [key: string]: number } = {};
    const monthlySpending: { [key: string]: number } = {};

    typedPurchases.forEach((p) => {
      const dateKey = format(parseISO(p.PurchaseDate), 'yyyy-MM-dd');
      dailySpending[dateKey] = (dailySpending[dateKey] || 0) + p.TotalAmount;

      const monthKey = format(parseISO(p.PurchaseDate), 'yyyy-MM');
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + p.TotalAmount;

      p.PurchaseItem.forEach((item) => {
        const categoryName = item.ItemMaster?.CategoryMaster?.CategoryName || "Uncategorized";
        const cost = item.UnitPrice * item.Qty;
        if (spendingMap[categoryName]) spendingMap[categoryName] += cost;
        else spendingMap[categoryName] = cost;
      });
    });
    setCategorySpending(Object.entries(spendingMap).map(([name, value]) => ({ name, value })));

    const sortedDailySpending = Object.entries(dailySpending)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSpendingOverTime(sortedDailySpending);

    const sortedMonthlySpending = Object.entries(monthlySpending)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    setMonthlyPurchases(sortedMonthlySpending);

    const { data: allPurchaseItems, error: allItemsError } = await supabase
      .from("PurchaseItem")
      .select("ItemMaster(*)");

    if (allItemsError) {
      toast.error("Failed to fetch top items", { description: allItemsError.message });
    } else {
      const itemCounts: { [key: string]: number } = {};
      allPurchaseItems.forEach(item => {
          const itemMaster = item.ItemMaster;
          const itemName = (Array.isArray(itemMaster) ? itemMaster[0] : itemMaster)?.ItemName;
          if (itemName) itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
      });
      const sortedItems = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      setTopItems(sortedItems);
    }

    setLoading(false);
  }, [dateRange]); // Removed user.id from dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-bold tracking-tight">Purchase Dashboard</h2>
          <Skeleton className="h-10 w-full sm:w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl font-bold tracking-tight">Purchase Dashboard</h2>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
      <StatsCards 
        totalSpent={totalSpent}
        totalPurchases={totalPurchases}
        totalItems={totalItems}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SpendingOverTimeChart data={spendingOverTime} />
        <MonthlyPurchasesChart data={monthlyPurchases} />
        <CategorySpendingChart data={categorySpending} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TopItemsChart data={topItems} />
        <RecentPurchases purchases={recentPurchases} />
      </div>
      <div className="grid gap-4 grid-cols-1">
        <RecentPurchaseItems />
      </div>
    </div>
  );
}

export default PurchaseDashboardPage;