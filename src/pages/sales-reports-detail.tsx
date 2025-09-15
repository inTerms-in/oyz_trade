"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { SalesDetail, ItemMaster, CustomerMaster } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Search } from "lucide-react";
import { Autocomplete } from "@/components/autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReportExportButtons } from "@/components/report-export-buttons";

const columns: ColumnDef<SalesDetail>[] = [
  {
    accessorKey: "SaleDate",
    header: "Date",
    cell: ({ row }) => format(new Date(row.getValue("SaleDate")), "PPP"),
  },
  {
    accessorKey: "ReferenceNo",
    header: "Ref No.",
  },
  {
    accessorKey: "CustomerMaster.CustomerName",
    header: "Customer",
    cell: ({ row }) => row.original.CustomerMaster?.CustomerName || "N/A",
  },
  {
    accessorKey: "TotalAmount",
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("TotalAmount"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "INR",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "PaymentType",
    header: "Payment Type",
  },
  {
    id: "items",
    header: "Items",
    cell: ({ row }) => (
      <ul className="list-disc list-inside">
        {row.original.SalesItem.map((item) => (
          <li key={item.SalesItemId}>
            {item.ItemMaster.ItemName} ({item.Qty} {item.Unit}) @ {new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(item.UnitPrice)}
          </li>
        ))}
      </ul>
    ),
  },
];

export default function SalesDetailReportPage() {
  const [data, setData] = React.useState<SalesDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [selectedItem, setSelectedItem] = React.useState<ItemMaster | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = React.useState<string>("");
  const [itemSuggestions, setItemSuggestions] = React.useState<ItemMaster[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerMaster | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState<string>("");
  const [customerSuggestions, setCustomerSuggestions] = React.useState<CustomerMaster[]>([]);

  const fetchSalesDetailReport = React.useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("Sales")
      .select(`
        SaleId,
        SaleDate,
        ReferenceNo,
        TotalAmount,
        AdditionalDiscount,
        DiscountPercentage,
        PaymentType,
        PaymentMode,
        CashAmount,
        BankAmount,
        CreditAmount,
        CustomerMaster (
          CustomerId,
          CustomerName,
          MobileNo
        ),
        SalesItem (
          SalesItemId,
          ItemId,
          Qty,
          Unit,
          UnitPrice,
          ItemMaster (
            ItemName,
            ItemCode
          )
        )
      `)
      .order("SaleDate", { ascending: false });

    if (dateRange?.from) {
      query = query.gte("SaleDate", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      query = query.lte("SaleDate", format(dateRange.to, "yyyy-MM-dd"));
    }
    if (selectedCustomer) {
      query = query.eq("CustomerId", selectedCustomer.CustomerId);
    }
    // Filtering by item requires a join condition on SalesItem, which is complex in Supabase RLS.
    // For now, we'll fetch all and filter client-side if an item is selected.
    // A more efficient way would be a custom RPC function or a view.

    const { data: salesData, error } = await query;

    if (error) {
      toast.error("Failed to fetch sales detail report", { description: error.message });
      setData([]);
    } else {
      let filteredData = salesData as SalesDetail[];
      if (selectedItem) {
        filteredData = filteredData.filter(sale =>
          sale.SalesItem.some(item => item.ItemId === selectedItem.ItemId)
        );
      }
      setData(filteredData);
    }
    setLoading(false);
  }, [dateRange, selectedItem, selectedCustomer]);

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

  const fetchCustomerSuggestions = React.useCallback(async (query: string) => {
    if (!query) {
      setCustomerSuggestions([]);
      return;
    }
    const { data, error } = await supabase
      .from("CustomerMaster")
      .select("CustomerId, CustomerName, MobileNo")
      .ilike("CustomerName", `%${query}%`)
      .limit(10);
    if (error) {
      console.error("Error fetching customer suggestions:", error);
      setCustomerSuggestions([]);
    } else {
      setCustomerSuggestions(data || []);
    }
  }, []);

  React.useEffect(() => {
    fetchSalesDetailReport();
  }, [fetchSalesDetailReport]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchItemSuggestions(itemSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [itemSearchTerm, fetchItemSuggestions]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomerSuggestions(customerSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [customerSearchTerm, fetchCustomerSuggestions]);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Detail Report</CardTitle>
          <CardDescription>Detailed view of all sales transactions with filtering options.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Autocomplete
              suggestions={itemSuggestions}
              value={itemSearchTerm}
              onValueChange={setItemSearchTerm}
              onSelect={(item) => {
                setSelectedItem(item);
                setItemSearchTerm(item.ItemName);
              }}
              getId={(item) => item.ItemId}
              getName={(item) => item.ItemName}
              getItemCode={(item) => item.ItemCode}
              label="Filter by Item"
              id="item-filter"
            />
            <Autocomplete
              suggestions={customerSuggestions}
              value={customerSearchTerm}
              onValueChange={setCustomerSearchTerm}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setCustomerSearchTerm(customer.CustomerName);
              }}
              getId={(customer) => customer.CustomerId}
              getName={(customer) => customer.CustomerName}
              label="Filter by Customer"
              id="customer-filter"
            />
            <Button variant="outline" onClick={() => {
              setDateRange(undefined);
              setSelectedItem(null);
              setItemSearchTerm("");
              setSelectedCustomer(null);
              setCustomerSearchTerm("");
            }}>
              Clear Filters
            </Button>
            <Button variant="outline" onClick={() => fetchSalesDetailReport()} disabled={loading}>
              <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh Report
            </Button>
            <ReportExportButtons
              data={data}
              columns={columns.filter(col => typeof col.accessorKey === 'string') as { header: string; accessorKey: string }[]}
              reportTitle="Sales Detail Report"
              fileName="sales_detail_report"
            />
          </div>
          <DataTable columns={columns} data={data} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}