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
import { Autocomplete } from "@/components/autocomplete";
import { ItemMaster } from "@/types";
import { ReportExportButtons } from "@/components/report-export-buttons";

interface ItemWiseSale {
  ItemId: number; // Added ItemId to interface
  ItemName: string;
  ItemCode: string;
  total_qty_sold: number;
  total_sales_amount: number;
}

const columns: ColumnDef<ItemWiseSale>[] = [
  {
    accessorKey: "ItemName",
    header: "Item Name",
  },
  {
    accessorKey: "ItemCode",
    header: "Item Code",
  },
  {
    accessorKey: "total_qty_sold",
    header: "Total Qty Sold",
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

export default function ItemWiseSalesPage() {
  const [data, setData] = React.useState<ItemWiseSale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [selectedItem, setSelectedItem] = React.useState<ItemMaster | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = React.useState<string>("");
  const [itemSuggestions, setItemSuggestions] = React.useState<ItemMaster[]>([]);

  const fetchItemWiseSales = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("SalesItem")
      .select(`
        Qty,
        UnitPrice,
        ItemId,
        Sales (
          SaleDate
        ),
        ItemMaster:ItemMaster (
          ItemId,
          ItemName,
          ItemCode
        )
      `);

    if (dateRange?.from) {
      query = query.gte("Sales.SaleDate", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      query = query.lte("Sales.SaleDate", format(dateRange.to, "yyyy-MM-dd"));
    }
    if (selectedItem) {
      query = query.eq("ItemId", selectedItem.ItemId);
    }

    const { data: salesItemData, error } = await query;

    if (error) {
      toast.error("Failed to fetch item-wise sales report", { description: error.message });
      setData([]);
    } else {
      const itemSummaryMap = new Map<number, ItemWiseSale>();
      // Define a local type that matches the query shape
      type SalesItemRow = {
        Qty: number;
        UnitPrice: number;
        ItemId: number;
        Sales: { SaleDate: string }[];
        ItemMaster?: ItemMaster | null;
      };
      salesItemData.forEach((salesItem: SalesItemRow) => { // Explicitly type salesItem
        const itemId = salesItem.ItemId;
        const itemName = salesItem.ItemMaster?.ItemName ?? "";
        const itemCode = salesItem.ItemMaster?.ItemCode ?? "";
        if (!itemSummaryMap.has(itemId)) {
          itemSummaryMap.set(itemId, { ItemId: itemId, ItemName: itemName, ItemCode: itemCode, total_qty_sold: 0, total_sales_amount: 0 });
        }
        const summary = itemSummaryMap.get(itemId)!;
        summary.total_qty_sold += salesItem.Qty;
        summary.total_sales_amount += salesItem.Qty * salesItem.UnitPrice;
      });

      const sortedSummary = Array.from(itemSummaryMap.values())
        .sort((a, b) => a.ItemName.localeCompare(b.ItemName));

      setData(sortedSummary);
    }
    setLoading(false);
  }, [dateRange, selectedItem]);

  const fetchItemSuggestions = React.useCallback(async (query: string) => {
    if (!query) {
      setItemSuggestions([]);
      return;
    }
    const { data, error } = await supabase
      .from("ItemMaster")
      .select("ItemId, ItemName, ItemCode")
      .ilike("ItemName", `%${query}%`)
      .limit(10);
    if (error) {
      console.error("Error fetching item suggestions:", error);
      setItemSuggestions([]);
    } else {
      setItemSuggestions(data || []);
    }
  }, []);

  React.useEffect(() => {
    fetchItemWiseSales();
  }, [fetchItemWiseSales]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchItemSuggestions(itemSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [itemSearchTerm, fetchItemSuggestions]);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Item-wise Sales Report</CardTitle>
          <CardDescription>View sales data by individual items.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Autocomplete
              suggestions={itemSuggestions}
              value={itemSearchTerm}
              onValueChange={setItemSearchTerm}
              onSelect={(item: ItemMaster) => { // Explicitly type item
                setSelectedItem(item);
                setItemSearchTerm(item.ItemName);
              }}
              getId={(item: ItemMaster) => item.ItemId} // Explicitly type item
              getName={(item: ItemMaster) => item.ItemName} // Explicitly type item
              getItemCode={(item: ItemMaster) => item.ItemCode} // Explicitly type item
              label="Filter by Item"
              id="item-filter"
            />
            <Button variant="outline" onClick={() => {
              setDateRange(undefined);
              setSelectedItem(null);
              setItemSearchTerm("");
            }}>
              Clear Filters
            </Button>
            <Button variant="outline" onClick={() => fetchItemWiseSales()} disabled={loading}>
              <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh Report
            </Button>
            <ReportExportButtons
              data={data}
              columns={columns as any} // Cast to any to bypass complex ColumnDef typing for now
              reportTitle="Item-wise Sales Report"
              fileName="item_wise_sales"
            />
          </div>
          <DataTable columns={columns} data={data} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}