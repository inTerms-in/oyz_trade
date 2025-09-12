"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithStock, PrintableItem } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-provider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Printer, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PrintableBarcodes } from "@/components/printable-barcodes";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function BarcodePrintPage() {
  const location = useLocation();
  const {  } = useAuth(); // Use useAuth
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "ItemName",
    direction: "asc",
  });

  const [selectedItems, setSelectedItems] = useState<PrintableItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const fetchItems = useCallback(async (initialItemIds?: number[]) => {
    // Removed user.id check here as per new global access policy
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("item_stock_details")
      .select("ItemId, ItemName, CategoryId, CategoryName, SellPrice, Barcode, ItemCode, RackNo", { count: "exact" });
      // Removed .eq("user_id", user.id); // Filter by user_id

    if (initialItemIds && initialItemIds.length > 0) {
      query = query.in("ItemId", initialItemIds);
    } else if (debouncedSearchTerm) {
      query = query.or(`ItemName.ilike.%${debouncedSearchTerm}%,ItemCode.ilike.%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    if (!initialItemIds) { // Only apply range if not fetching specific initial items
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch items", { description: error.message });
      setItems([]);
    } else {
      const fetchedItems = data as ItemWithStock[];
      setItems(fetchedItems);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));

      if (initialItemIds && initialItemIds.length > 0) {
        // Pre-select items that were passed via state
        const preSelected = fetchedItems.map(item => ({
          ...item,
          CategoryMaster: item.CategoryName ? { CategoryName: item.CategoryName } : null,
          quantityToPrint: 1,
        }));
        setSelectedItems(preSelected);
      }
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort]); // Removed user.id from dependencies

  useEffect(() => {
    const initialItemIds = location.state?.initialSelectedItems as number[] | undefined;
    fetchItems(initialItemIds);
    if (location.state?.initialSelectedItems) {
      window.history.replaceState({}, document.title);
    }
  }, [fetchItems, location.state?.initialSelectedItems]);

  const handleSort = (column: string) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemsAsPrintable = items.map(item => ({
        ...item,
        CategoryMaster: item.CategoryName ? { CategoryName: item.CategoryName } : null,
        quantityToPrint: 1, // Default quantity
      }));
      setSelectedItems(allItemsAsPrintable);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (item: ItemWithStock, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        ...item,
        CategoryMaster: item.CategoryName ? { CategoryName: item.CategoryName } : null,
        quantityToPrint: 1, // Default quantity
      }]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.ItemId !== item.ItemId));
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setSelectedItems(prev => 
      prev.map(item => 
        item.ItemId === itemId ? { ...item, quantityToPrint: Math.max(1, quantity) } : item
      )
    );
  };

  const isItemSelected = (itemId: number) => selectedItems.some(item => item.ItemId === itemId);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const totalLabelsToPrint = selectedItems.reduce((sum, item) => sum + item.quantityToPrint, 0);

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="print-only">
        <PrintableBarcodes itemsToPrint={selectedItems} ref={printRef} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Barcode Printing</CardTitle>
              <CardDescription>Select items to print their barcodes on A4 sticker sheets (2x1 inch labels).</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Input
                placeholder="Search items by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handlePrint} disabled={selectedItems.length === 0 || totalLabelsToPrint === 0}>
                    <span className="flex items-center">
                      <Printer className="mr-2 h-4 w-4" />
                      <span>Print ({totalLabelsToPrint})</span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Print Barcodes (Ctrl+P)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked: boolean) => handleSelectAll(checked)}
                      aria-label="Select all items"
                    />
                  </TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ItemName")}>
                      <span className="flex items-center">
                        <span>Name</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CategoryName")}>
                      <span className="flex items-center">
                        <span>Category</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-center">Barcode</TableHead>
                  <TableHead className="w-[100px] text-center">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(pageSize)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length > 0 ? (
                  items.map((item) => {
                    const selectedItem = selectedItems.find(s => s.ItemId === item.ItemId);
                    return (
                      <TableRow key={item.ItemId}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isItemSelected(item.ItemId)}
                            onCheckedChange={(checked: boolean) => handleSelectItem(item, checked)}
                            aria-label={`Select item ${item.ItemName}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.ItemCode || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{item.ItemName}</TableCell>
                        <TableCell>{item.CategoryName || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(item.SellPrice || 0)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {item.Barcode || <span className="text-muted-foreground text-xs">No Barcode</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {isItemSelected(item.ItemId) && (
                            <FloatingLabelInput
                              id={`qty-${item.ItemId}`}
                              label=" "
                              type="number"
                              value={selectedItem?.quantityToPrint || 1}
                              onChange={(e) => handleQuantityChange(item.ItemId, e.target.valueAsNumber)}
                              min={1}
                              className="w-20 text-center"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            pageIndex={pageIndex}
            pageCount={pageCount}
            pageSize={pageSize}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            itemCount={itemCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default BarcodePrintPage;