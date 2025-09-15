"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockAdjustment, Item, Category } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Autocomplete } from "@/components/autocomplete";
import { Badge } from "@/components/ui/badge";

interface StockLedgerEntry {
  AdjustmentDate: string;
  ItemName: string;
  ItemCode: string;
  CategoryName: string;
  AdjustmentType: 'in' | 'out';
  Quantity: number;
  Reason?: string | null;
}

export default function StockLedgerPage() {
  const [data, setData] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [itemSuggestions, setItemSuggestions] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    const { data: itemsData, error } = await supabase
      .from("ItemMaster")
      .select("ItemId, ItemName, Barcode, ItemCode");
    if (error) {
      toast.error("Failed to fetch items for filter", { description: error.message });
    } else {
      setItemSuggestions(itemsData || []);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("StockAdjustment")
      .select("*, ItemMaster(ItemId, ItemName, Barcode, ItemCode, CategoryMaster(CategoryName))")
      .order("AdjustmentDate", { ascending: false })
      .order("created_at", { ascending: false });

    if (selectedItem) {
      query = query.eq("ItemId", selectedItem.ItemId);
    }

    if (dateRange.from) {
      query = query.gte("AdjustmentDate", format(dateRange.from, "yyyy-MM-dd"));
    }
    if (dateRange.to) {
      query = query.lte("AdjustmentDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    const { data: stockAdjustments, error } = await query;

    if (error) {
      toast.error("Failed to fetch stock ledger", { description: error.message });
      setData([]);
    } else {
      setData(stockAdjustments || []);
    }
    setLoading(false);
  }, [selectedItem, dateRange]);

  useEffect(() => {
    fetchItems();
    fetchData();
  }, [fetchItems, fetchData]);

  const columns: ColumnDef<StockLedgerEntry>[] = useMemo(
    () => [
      {
        accessorKey: "AdjustmentDate",
        header: "Date",
        cell: ({ row }) => format(new Date(row.original.AdjustmentDate), "PPP"),
      },
      {
        accessorKey: "ItemName",
        header: "Item Name",
      },
      {
        accessorKey: "ItemCode",
        header: "Item Code",
      },
      {
        accessorKey: "CategoryName",
        header: "Category",
      },
      {
        accessorKey: "AdjustmentType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={row.original.AdjustmentType === 'in' ? 'default' : 'destructive'}>
            {row.original.AdjustmentType === 'in' ? 'In' : 'Out'}
          </Badge>
        ),
      },
      {
        accessorKey: "Quantity",
        header: "Quantity",
      },
      {
        accessorKey: "Reason",
        header: "Reason",
      },
    ],
    []
  );

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };

  const handleItemNameChange = (name: string) => {
    if (!name) {
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 py-4">
            <div className="relative flex-1 min-w-[200px]">
              <Autocomplete<Item>
                suggestions={itemSuggestions}
                value={selectedItem?.ItemName || ""}
                onValueChange={handleItemNameChange}
                onSelect={handleItemSelect}
                label="Filter by Item"
                id="item-filter"
                getId={(item) => item.ItemId}
                getName={(item) => item.ItemName || ''}
                getItemCode={(item) => item.ItemCode}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {(selectedItem || dateRange.from) && (
              <Button variant="ghost" onClick={() => { setSelectedItem(null); setDateRange({}); }} className="h-10">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-8 h-10 w-[150px] lg:w-[250px]"
              />
            </div>
          </div>
          <DataTable columns={columns} data={data} loading={loading} globalFilter={globalFilter} />
        </CardContent>
      </Card>
    </div>
  );
}