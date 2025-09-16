"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportExportButtons } from "@/components/report-export-buttons"; // Import the new component

interface DateWiseSale {
  SaleDate: string;
  total_sales_amount: number;
  total_sales_count: number;
  total_items_sold: number;
}

const columns: ColumnDef<DateWiseSale>[] = [
  {
    accessorKey: "SaleDate",
    header: "Date",
    cell: ({ row }) => format(new Date(row.getValue("SaleDate")), "PPP"),
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

export default function DateWiseSalesPage() {
  const [data, setData] = React.useState<DateWiseSale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const fetchDateWiseSales = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("Sales")
      .select(`
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
      toast.error("Failed to fetch date-wise sales report", { description: error.message });
      setData([]);
    } else {
      const dailySummaryMap = new Map<string, { total_sales_amount: number; total_sales_count: number; total_items_sold: number }>();

      salesData.forEach((sale) => {
        const saleDateKey = format(new Date(sale.SaleDate), "yyyy-MM-dd");

        if (!dailySummaryMap.has(saleDateKey)) {
          dailySummaryMap.set(saleDateKey, { total_sales_amount: 0, total_sales_count: 0, total_items_sold: 0 });
        }

        const summary = dailySummaryMap.get(saleDateKey)!;
        summary.total_sales_count += 1;
        summary.total_sales_amount += sale.TotalAmount || 0;
        sale.SalesItem.forEach(item => {
          summary.total_items_sold += item.Qty;
        });
      });

      const sortedSummary = Array.from(dailySummaryMap.entries())
        .map(([SaleDate, summary]) => ({ SaleDate, ...summary }))
        .sort((a, b) => new Date(a.SaleDate).getTime() - new Date(b.SaleDate).getTime());

      setData(sortedSummary);
    }
    setLoading(false);
  }, [dateRange]);

  React.useEffect(() => {
    fetchDateWiseSales();
  }, [fetchDateWiseSales]);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Date-wise Sales Report</CardTitle>
          <CardDescription>View sales data grouped by date.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchDateWiseSales()} disabled={loading}>
                <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
                Refresh
              </Button>
              <ReportExportButtons
                data={data}
                columns={columns as any} // Cast to any to bypass complex ColumnDef typing for now
                reportTitle="Date-wise Sales Report"
                fileName="date_wise_sales"
              />
            </div>
          </div>
          <DataTable columns={columns} data={data} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}