"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { SalesDetail, ItemMaster, CustomerMaster, SalesDetailItem } from "@/types"; // Corrected imports
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Autocomplete } from "@/components/autocomplete";
import { ReportExportButtons } from "@/components/report-export-buttons";

interface SalesDetailReport extends SalesDetail {
  // Add any additional fields needed for the report table if they are not in SalesDetail
}

const columns: ColumnDef<SalesDetailReport>[] = [
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
    cell: ({ row }) => row.original.CustomerMaster?.CustomerName || 'Walk-in Customer',
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
    accessorKey: "SalesItem",
    header: "Items",
    cell: ({ row }) => (
      <ul className="list-disc list-inside text-xs">
        {row.original.SalesItem.map((item, index) => (
          <li key={index}>{item.ItemMaster.ItemName} ({item.Qty} {item.Unit})</li>
        ))}
      </ul>
    ),
  },
];

export default function SalesDetailReportPage() {
  const [data, setData] = React.useState<SalesDetailReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [selectedItem, setSelectedItem] = React.useState<ItemMaster | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = React.useState<string>("");
  const [itemSuggestions, setItemSuggestions] = React.useState<ItemMaster[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerMaster | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = React.useState<string>("");
  const [customerSuggestions, setCustomerSuggestions] = React.useState<CustomerMaster[]>([]);

  const fetchSalesDetail = React.useCallback(async () => {
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
        CustomerMaster(CustomerId, CustomerName, MobileNo),
        SalesItem(SalesItemId, ItemId, Qty, Unit, UnitPrice, ItemMaster(ItemName, ItemCode))
      `);

    if (dateRange?.from) {
      query = query.gte("SaleDate", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange?.to) {
      query = query.lte("SaleDate", format(dateRange.to, "yyyy-MM-dd"));
    }
    if (selectedItem) {
      query = query.eq("SalesItem.ItemId", selectedItem.ItemId);
    }
    if (selectedCustomer) {
      query = query.eq("CustomerId", selectedCustomer.CustomerId);
    }

    const { data: salesData, error } = await query;

    if (error) {
      toast.error("Failed to fetch sales detail report", { description: error.message });
      setData([]);
    } else {
      // Ensure CustomerMaster and SalesItem are correctly typed
      const processedData: SalesDetailReport[] = salesData.map((sale: SalesDetail) => ({ // Explicitly type sale
        ...sale,
        CustomerMaster: sale.CustomerMaster ? {
          CustomerId: sale.CustomerMaster.CustomerId,
          CustomerName: sale.CustomerMaster.CustomerName,
          MobileNo: sale.CustomerMaster.MobileNo,
        } : null,
        SalesItem: sale.SalesItem.map((item: SalesDetailItem) => ({ // Explicitly type item
          SalesItemId: item.SalesItemId,
          ItemId: item.ItemId,
          Qty: item.Qty,
          Unit: item.Unit,
          UnitPrice: item.UnitPrice,
          ItemMaster: {
            ItemName: item.ItemMaster.ItemName,
            ItemCode: item.ItemMaster.ItemCode,
          },
        })),
      }));
      setData(processedData);
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
      .select("CustomerId, CustomerName")
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
    fetchSalesDetail();
  }, [fetchSalesDetail]);

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
          <CardDescription>Detailed view of sales transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Autocomplete
              suggestions={itemSuggestions}
              value={itemSearchTerm}
              onValueChange={setItemSearchTerm}
              onSelect={(item: ItemMaster) => {
                setSelectedItem(item);
                setItemSearchTerm(item.ItemName);
              }}
              getId={(item: ItemMaster) => item.ItemId}
              getName={(item: ItemMaster) => item.ItemName}
              getItemCode={(item: ItemMaster) => item.ItemCode}
              label="Filter by Item"
              id="item-filter"
            />
            <Autocomplete
              suggestions={customerSuggestions}
              value={customerSearchTerm}
              onValueChange={setCustomerSearchTerm}
              onSelect={(customer: CustomerMaster) => {
                setSelectedCustomer(customer);
                setCustomerSearchTerm(customer.CustomerName);
              }}
              getId={(customer: CustomerMaster) => customer.CustomerId}
              getName={(customer: CustomerMaster) => customer.CustomerName}
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
            <Button variant="outline" onClick={() => fetchSalesDetail()} disabled={loading}>
              <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
              Refresh Report
            </Button>
            <ReportExportButtons
              data={data}
              columns={columns as any} // Cast to any to bypass complex ColumnDef typing for now
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