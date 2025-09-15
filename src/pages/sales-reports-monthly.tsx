"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { MonthlySalesSummary } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportExportButtons } from "@/components/report-export-buttons";

const columns: ColumnDef<MonthlySalesSummary>[] = [
  {
    accessorKey: "month_year",
    header: "Month",
  },
  {
    accessorKey: "total_sales_count",
    header: "Total Sales",
  },
  {
    accessorKey: "total_items_sold",
    header: "Total Items Sold",
  },
  {
    accessorKey: "total_sales_amount",
    header: () => <div className="text-right">Total Sales Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_sales_amount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];

export default function MonthlySalesSummaryPage() {
  const [data, setData] = React.useState<MonthlySalesSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(subMonths(today, 5)), // Last 6 months
      to: endOfMonth(today),
    };
  });

  const fetchMonthlySalesSummary = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("Sales")
      .select(`
        SaleId,
        SaleDate,
        TotalAmount,
        SalesItem(Qty)
      `);

    if (dateRange?.from) {
      query = query.gte("SaleDate", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      query = query.lte("SaleDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    const { data: salesData, error } = await query;

    if (error) {
      toast.error("Failed to fetch monthly sales summary", { description: error.message });
      setData([]);
    } else {
      const monthlySummaryMap = new Map<string, { total_sales_amount: number; total_sales_count: number; total_items_sold: number }>();

      salesData.forEach((sale) => {
        const saleDate = new Date(sale.SaleDate);
        const monthYearKey = format(saleDate, "MMMM yyyy");

        if (!monthlySummaryMap.has(monthYearKey)) {
          monthlySummaryMap.set(monthYearKey, { total_sales_amount: 0, total_sales_count: 0, total_items_sold: 0 });
        }

        const summary = monthlySummaryMap.get(monthYearKey)!;
        summary.total_sales_count += 1;
        summary.total_sales_amount += sale.TotalAmount || 0;
        sale.SalesItem.forEach(item => {
          summary.total_items_sold += item.Qty;
        });
      });

      const sortedSummary = Array.from(monthlySummaryMap.entries())
        .map(([month_year, summary]) => ({ month_year, ...summary }))
        .sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime()); // Sort by date

      setData(sortedSummary);
    }
    setLoading(false);
  }, [dateRange]);

  React.useEffect(() => {
    fetchMonthlySalesSummary();
  }, [fetchMonthlySalesSummary]);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Summary</CardTitle>
          <CardDescription>Overview of sales performance by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchMonthlySalesSummary()} disabled={loading}>
                <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
                Refresh
              </Button>
              <ReportExportButtons
                data={data}
                columns={columns.filter(col => typeof col.accessorKey === 'string') as { header: string; accessorKey: string }[]}
                reportTitle="Monthly Sales Summary Report"
                fileName="monthly_sales_summary"
              />
            </div>
          </div>
          <DataTable columns={columns} data={data} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}