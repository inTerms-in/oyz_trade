import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { ItemWithStock } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SpendingOverTimeChart } from "@/components/dashboard/spending-over-time-chart";
import { SalesOverTimeChart } from "@/components/dashboard/sales-over-time-chart";
import { ExpensesOverTimeChart } from "@/components/dashboard/expenses-over-time-chart";
import { CategorySpendingChart } from "@/components/dashboard/category-spending-chart";
import { SalesPurchaseComparisonChart } from "@/components/dashboard/sales-purchase-comparison-chart";
import { StockHealthGauge } from "@/components/dashboard/stock-health-gauge";
import { OverviewStatsCards } from "@/components/dashboard/overview-stats-cards";

function LowStockItems({ items }: { items: ItemWithStock[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" /> Low Stock Items</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.ItemId}>
                  <TableCell>{item.ItemName}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.current_stock <= 0 ? "destructive" : "secondary"}>
                      {item.current_stock}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No items are currently low on stock. Great job!</p>
        )}
        <Link to="/inventory">
            <Button variant="link" className="mt-4 px-0">View Full Inventory &rarr;</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

interface DailyTotal {
  date: string;
  total: number;
}

interface CategorySpending {
  name: string;
  value: number;
}

interface MonthlyComparison {
  month: string;
  sales: number;
  purchases: number;
}

function OverviewDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPurchaseSpending, setTotalPurchaseSpending] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<ItemWithStock[]>([]);
  const [purchaseSpendingOverTime, setPurchaseSpendingOverTime] = useState<DailyTotal[]>([]);
  const [salesRevenueOverTime, setSalesRevenueOverTime] = useState<DailyTotal[]>([]);
  const [expensesOverTime, setExpensesOverTime] = useState<DailyTotal[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsInStock, setItemsInStock] = useState(0);
  const [showSales, setShowSales] = useState(true); // New state for sales visibility
  const [showPurchases, setShowPurchases] = useState(true); // New state for purchases visibility

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Default to 1st of current month
    to: new Date(),
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      let currentTotalPurchaseSpending = 0;
      let currentTotalExpenses = 0;

      // Declare maps for monthly data aggregation at a higher scope
      const salesByMonth: Record<string, number> = {};
      const purchasesByMonth: Record<string, number> = {};

      // Fetch total item count and items in stock for gauge
      const { count: totalItemsCount, error: totalItemsError } = await supabase
        .from("ItemMaster")
        .select('*', { count: 'exact', head: true });
      if (totalItemsError) toast.error("Failed to fetch total item count", { description: totalItemsError.message });
      else setTotalItems(totalItemsCount || 0);

      const { count: itemsInStockCount, error: itemsInStockError } = await supabase
        .from("item_stock_details")
        .select('*', { count: 'exact', head: true })
        .gt('current_stock', 0);
      if (itemsInStockError) toast.error("Failed to fetch items in stock count", { description: itemsInStockError.message });
      else setItemsInStock(itemsInStockCount || 0);


      // Fetch Sales
      let salesQuery = supabase.from("Sales").select("TotalAmount, SaleDate");
      // .eq("user_id", user.id); // Removed user_id filter
      if (dateRange?.from) salesQuery = salesQuery.gte("SaleDate", dateRange.from.toISOString());
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        salesQuery = salesQuery.lte("SaleDate", toDate.toISOString());
      }
      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) toast.error("Failed to fetch sales data", { description: salesError.message });
      else {
        setTotalRevenue(sales.reduce((acc, s) => acc + s.TotalAmount, 0));
        
        const salesByDate: { [key: string]: number } = {};
        sales.forEach(sale => {
          const dateKey = format(parseISO(sale.SaleDate), 'yyyy-MM-dd');
          salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.TotalAmount;

          const monthKey = format(parseISO(sale.SaleDate), 'yyyy-MM'); // Use yyyy-MM for internal key
          salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + sale.TotalAmount;
        });
        const sortedSalesOverTime = Object.entries(salesByDate)
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSalesRevenueOverTime(sortedSalesOverTime);
      }

      // Fetch Purchases and aggregate by category for pie chart
      let purchasesQuery = supabase
        .from("Purchase")
        .select("TotalAmount, PurchaseDate, PurchaseItem(Qty, UnitPrice, ItemMaster(CategoryMaster(CategoryName)))");
        // .eq("user_id", user.id); // Removed user_id filter
      if (dateRange?.from) purchasesQuery = purchasesQuery.gte("PurchaseDate", dateRange.from.toISOString());
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        purchasesQuery = purchasesQuery.lte("PurchaseDate", toDate.toISOString());
      }
      const { data: purchases, error: purchasesError } = await purchasesQuery;
      if (purchasesError) toast.error("Failed to fetch purchase data", { description: purchasesError.message });
      else {
        const purchaseTotal = purchases.reduce((acc, p) => acc + p.TotalAmount, 0);
        currentTotalPurchaseSpending = purchaseTotal;
        
        const purchasesByDate: { [key: string]: number } = {};
        const spendingMap: { [key: string]: number } = {};

        purchases.forEach(purchase => {
          const dateKey = format(parseISO(purchase.PurchaseDate), 'yyyy-MM-dd');
          purchasesByDate[dateKey] = (purchasesByDate[dateKey] || 0) + purchase.TotalAmount;

          const monthKey = format(parseISO(purchase.PurchaseDate), 'yyyy-MM'); // Use yyyy-MM for internal key
          purchasesByMonth[monthKey] = (purchasesByMonth[monthKey] || 0) + purchase.TotalAmount;

          // Aggregate spending by category
          purchase.PurchaseItem.forEach((item: any) => {
            const categoryName = item.ItemMaster?.CategoryMaster?.CategoryName || "Uncategorized";
            const cost = item.UnitPrice * item.Qty;
            if (spendingMap[categoryName]) spendingMap[categoryName] += cost;
            else spendingMap[categoryName] = cost;
          });
        });
        setCategorySpending(Object.entries(spendingMap).map(([name, value]) => ({ name, value })));

        const sortedPurchaseSpendingOverTime = Object.entries(purchasesByDate)
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setPurchaseSpendingOverTime(sortedPurchaseSpendingOverTime);
      }

      // Fetch Expenses
      let expensesQuery = supabase.from("Expenses").select("Amount, ExpenseDate");
      // .eq("user_id", user.id); // Removed user_id filter
      if (dateRange?.from) expensesQuery = expensesQuery.gte("ExpenseDate", dateRange.from.toISOString());
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        expensesQuery = expensesQuery.lte("ExpenseDate", toDate.toISOString());
      }
      const { data: expenses, error: expensesError } = await expensesQuery;
      if (expensesError) toast.error("Failed to fetch expenses data", { description: expensesError.message });
      else {
        const expenseTotal = expenses.reduce((acc, e) => acc + e.Amount, 0);
        currentTotalExpenses = expenseTotal;
        const expensesByDate: { [key: string]: number } = {};
        expenses.forEach(expense => {
          const dateKey = format(parseISO(expense.ExpenseDate), 'yyyy-MM-dd');
          expensesByDate[dateKey] = (expensesByDate[dateKey] || 0) + expense.Amount;
        });
        const sortedExpensesOverTime = Object.entries(expensesByDate)
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setExpensesOverTime(sortedExpensesOverTime);
      }

      setTotalPurchaseSpending(currentTotalPurchaseSpending);
      setTotalExpenses(currentTotalExpenses);

      // Combine monthly sales and purchases for comparison chart
      const combinedMonthlyData: { [key: string]: { sales: number; purchases: number } } = {};
      Object.entries(salesByMonth).forEach(([monthKey, total]) => {
        combinedMonthlyData[monthKey] = { sales: total, purchases: 0 };
      });
      Object.entries(purchasesByMonth).forEach(([monthKey, total]) => {
        if (combinedMonthlyData[monthKey]) {
          combinedMonthlyData[monthKey].purchases = total;
        } else {
          combinedMonthlyData[monthKey] = { sales: 0, purchases: total };
        }
      });
      const sortedMonthlyComparison = Object.entries(combinedMonthlyData)
        .map(([monthKey, totals]) => ({ month: monthKey, ...totals }))
        .sort((a, b) => a.month.localeCompare(b.month));
      setMonthlyComparison(sortedMonthlyComparison);


      // Fetch Low Stock Items
      const { data: stockData, error: stockError } = await supabase
        .from("item_stock_details")
        .select("*")
        .lte("current_stock", 5)
        .order("current_stock", { ascending: true });
      
      if (stockError) toast.error("Failed to fetch stock data", { description: stockError.message });
      else setLowStockItems(stockData as ItemWithStock[]);

      setLoading(false);
    }

    fetchData();
  }, [dateRange]);

  // Handler for card clicks to toggle chart visibility
  const handleCardClick = (type: 'sales' | 'purchases' | 'reset') => {
    if (type === 'sales') {
      setShowSales(prev => !prev);
    } else if (type === 'purchases') {
      setShowPurchases(prev => !prev);
    } else { // 'reset' for Expenses and Net Profit cards
      setShowSales(true);
      setShowPurchases(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <Skeleton className="h-10 w-full sm:w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
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
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const netProfit = totalRevenue - (totalPurchaseSpending + totalExpenses);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
      <OverviewStatsCards 
        totalRevenue={totalRevenue}
        totalPurchaseSpending={totalPurchaseSpending}
        totalExpenses={totalExpenses}
        netProfit={netProfit}
        onCardClick={handleCardClick}
        showSales={showSales}
        showPurchases={showPurchases}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SalesOverTimeChart data={salesRevenueOverTime} />
        <SpendingOverTimeChart data={purchaseSpendingOverTime} />
        <ExpensesOverTimeChart data={expensesOverTime} />
      </div>
      <div className="grid gap-4 grid-cols-1"> {/* Full width for comparison chart */}
        <SalesPurchaseComparisonChart data={monthlyComparison} showSales={showSales} showPurchases={showPurchases} />
      </div>
      <div className="grid gap-4 md:grid-cols-2"> {/* Grouping related charts */}
        <CategorySpendingChart data={categorySpending} />
        <StockHealthGauge totalItems={totalItems} itemsInStock={itemsInStock} />
      </div>
      <div className="grid gap-4 grid-cols-1"> {/* Full width for low stock items table */}
        <LowStockItems items={lowStockItems} />
      </div>
    </div>
  );
}

export default OverviewDashboardPage;