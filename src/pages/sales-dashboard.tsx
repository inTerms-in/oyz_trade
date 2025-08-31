import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SaleWithItems, HourlySales } from "@/types";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/auth-provider";

import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Tag, Filter, Calendar as CalendarIcon } from "lucide-react";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { RecentSaleItems } from "@/components/dashboard/recent-sale-items";
import { TopSoldItemsChart } from "@/components/dashboard/top-sold-items-chart";
import { SalesOverTimeChart } from "@/components/dashboard/sales-over-time-chart";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { SalesByHourChart } from "@/components/dashboard/sales-by-hour-chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SalesStatsCardsProps {
  totalRevenue: number;
  totalSales: number;
  totalItemsSold: number;
}

function SalesStatsCards({ totalRevenue, totalSales, totalItemsSold }: SalesStatsCardsProps) {
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/20 text-chart-2"><DollarSign className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/20 text-chart-4"><ShoppingBag className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">+{totalSales}</div></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/20 text-chart-1"><Tag className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{totalItemsSold}</div></CardContent>
      </Card>
    </div>
  );
}

interface TopSoldItem {
  name: string;
  count: number;
}

interface SalesOverTime {
  date: string;
  total: number;
}

interface MonthlyTotal {
  month: string;
  total: number;
}

interface RawHourlySale {
  date: string;
  hour: number;
  amount: number;
}

function SalesDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [recentSales, setRecentSales] = useState<SaleWithItems[]>([]);
  const [topSoldItems, setTopSoldItems] = useState<TopSoldItem[]>([]);
  const [salesOverTime, setSalesOverTime] = useState<SalesOverTime[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlyTotal[]>([]);
  
  const [allRawHourlySales, setAllRawHourlySales] = useState<RawHourlySale[]>([]);
  const [filterHourlyType, setFilterHourlyType] = useState<'all' | 'day' | 'month'>('all');
  const [selectedHourlyDate, setSelectedHourlyDate] = useState<Date | undefined>(undefined);
  const [selectedHourlyMonth, setSelectedHourlyMonth] = useState<string | undefined>(undefined);
  const [displayHourlySales, setDisplayHourlySales] = useState<HourlySales[]>([]);
  const [availableHourlyMonths, setAvailableHourlyMonths] = useState<string[]>([]);

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const fetchData = useCallback(async () => {
    if (!user?.id) { // Still need user for authentication, but not for data filtering
      setLoading(false);
      return;
    }
    setLoading(true);

    let query = supabase
      .from("Sales")
      .select("*, SalesItem(*), CustomerMaster(CustomerName)")
      .order("SaleDate", { ascending: false });

    if (dateRange?.from) query = query.gte("SaleDate", dateRange.from.toISOString());
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("SaleDate", toDate.toISOString());
    }

    const { data: sales, error: salesError } = await query;

    if (salesError) {
      toast.error("Failed to fetch sales data", { description: salesError.message });
      setLoading(false);
      return;
    }

    const typedSales = sales as SaleWithItems[];
    
    const totalRev = typedSales.reduce((acc, s) => acc + s.TotalAmount, 0);
    const totalItems = typedSales.reduce((acc, s) => acc + s.SalesItem.reduce((itemAcc, item) => itemAcc + item.Qty, 0), 0);
    
    setTotalRevenue(totalRev);
    setTotalSales(typedSales.length);
    setTotalItemsSold(totalItems);
    setRecentSales(typedSales.slice(0, 10));

    const { data: allSaleItems, error: allItemsError } = await supabase
      .from("SalesItem")
      .select("ItemId, Qty, ItemMaster(ItemName)");

    if (allItemsError) {
      toast.error("Failed to fetch top sold items", { description: allItemsError.message });
    } else {
      const itemCounts: { [key: string]: number } = {};
      allSaleItems.forEach(item => {
          const itemMaster = item.ItemMaster;
          const itemName = (Array.isArray(itemMaster) ? itemMaster[0] : itemMaster)?.ItemName;
          if (itemName) itemCounts[itemName] = (itemCounts[itemName] || 0) + item.Qty;
      });
      const sortedItems = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      setTopSoldItems(sortedItems);
    }

    const salesByDate: { [key: string]: number } = {};
    const salesByMonth: { [key: string]: number } = {};
    const rawHourlySalesData: RawHourlySale[] = [];
    const uniqueDates = new Set<string>();
    const uniqueMonths = new Set<string>();

    typedSales.forEach(sale => {
      const saleDate = parseISO(sale.SaleDate);
      const dateKey = format(saleDate, 'yyyy-MM-dd');
      const monthKey = format(saleDate, 'yyyy-MM');
      const hourKey = saleDate.getHours();

      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.TotalAmount;
      salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + sale.TotalAmount;
      
      rawHourlySalesData.push({ date: dateKey, hour: hourKey, amount: sale.TotalAmount });
      uniqueDates.add(dateKey);
      uniqueMonths.add(monthKey);
    });

    setAllRawHourlySales(rawHourlySalesData);
    setAvailableHourlyMonths(Array.from(uniqueMonths).sort());

    const sortedSalesOverTime = Object.entries(salesByDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSalesOverTime(sortedSalesOverTime);

    const sortedMonthlySales = Object.entries(salesByMonth)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    setMonthlySales(sortedMonthlySales);

    setLoading(false);
  }, [dateRange, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const hourlyAggregated: { [hour: number]: number } = {};
    let filteredRawSales = allRawHourlySales;

    if (filterHourlyType === 'day' && selectedHourlyDate) {
      const formattedSelectedDate = format(selectedHourlyDate, 'yyyy-MM-dd');
      filteredRawSales = filteredRawSales.filter(sale => sale.date === formattedSelectedDate);
    } else if (filterHourlyType === 'month' && selectedHourlyMonth) {
      filteredRawSales = filteredRawSales.filter(sale => format(parseISO(sale.date), 'yyyy-MM') === selectedHourlyMonth);
    }

    for (let i = 0; i < 24; i++) {
      hourlyAggregated[i] = 0;
    }

    filteredRawSales.forEach(sale => {
      hourlyAggregated[sale.hour] = (hourlyAggregated[sale.hour] || 0) + sale.amount;
    });

    const processedHourlySales = Object.entries(hourlyAggregated)
      .map(([hour, total_sales]) => ({ hour: Number(hour), total_sales }))
      .sort((a, b) => a.hour - b.hour);
    
    setDisplayHourlySales(processedHourlySales);
  }, [allRawHourlySales, filterHourlyType, selectedHourlyDate, selectedHourlyMonth]);

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-bold tracking-tight">Sales Dashboard</h2>
          <Skeleton className="h-10 w-full sm:w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-80" />
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
        <h2 className="text-2xl font-bold tracking-tight">Sales Dashboard</h2>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
      <SalesStatsCards 
        totalRevenue={totalRevenue}
        totalSales={totalSales}
        totalItemsSold={totalItemsSold}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SalesOverTimeChart data={salesOverTime} />
        <MonthlySalesChart data={monthlySales} />
        <Card>
          <CardHeader>
            <CardTitle>Sales by Time of Day</CardTitle>
            <CardDescription>Total sales revenue for each hour of the day.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesByHourChart data={displayHourlySales} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RecentSales sales={recentSales} />
        <TopSoldItemsChart data={topSoldItems} />
      </div>
      <div className="grid gap-4 grid-cols-1">
        <RecentSaleItems />
      </div>
    </div>
  );
}

export default SalesDashboardPage;