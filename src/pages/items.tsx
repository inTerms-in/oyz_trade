import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithStock } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { generateItemCode } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
// Removed useAuth import as user_id filtering is no longer applied

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddItemDialog } from "@/components/add-item-dialog";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteItemAlert } from "@/components/delete-item-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { PlusCircle, ArrowUpDown, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type SortDirection = "asc" | "desc";

function ItemsPage() {
  const navigate = useNavigate();
  // Removed user from useAuth
  const [items, setItems] = useState<ItemWithStock[]>(([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

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

  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("item_stock_details")
      .select("*", { count: "exact" });
      // Removed .eq("user_id", user.id)

    if (debouncedSearchTerm) {
      query = query.or(`ItemName.ilike.%${debouncedSearchTerm}%,ItemCode.ilike.%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch items", { description: error.message });
      setItems([]);
    } else {
      setItems(data as ItemWithStock[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort]); // Removed user.id from dependencies

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSort = (column: string) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(items.map(item => item.ItemId));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItemIds(prev => [...prev, itemId]);
    } else {
      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const handlePrintSelectedBarcodes = () => {
    if (selectedItemIds.length === 0) {
      toast.info("Please select at least one item to print barcodes.");
      return;
    }
    navigate('/barcode-print', { state: { initialSelectedItems: selectedItemIds } });
  };

  const isItemSelected = (itemId: number) => selectedItemIds.includes(itemId);
  const isAllSelected = items.length > 0 && selectedItemIds.length === items.length;

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>Manage your items and view stock levels.</CardDescription>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Input
                placeholder="Search items by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[250px]"
              />
              <Button onClick={() => setAddDialogOpen(true)}>
                <span className="flex items-center">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>New Item</span>
                </span>
              </Button>
              <Button 
                onClick={handlePrintSelectedBarcodes} 
                disabled={selectedItemIds.length === 0}
                variant="outline"
              >
                <span className="flex items-center">
                  <Printer className="mr-2 h-4 w-4" />
                  <span>Print Barcodes ({selectedItemIds.length})</span>
                </span>
              </Button>
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
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("RackNo")}>
                      <span className="flex items-center">
                        <span>Rack No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                     <Button variant="ghost" onClick={() => handleSort("SellPrice")}>
                      <span className="flex items-center">
                        <span>Sell Price</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort("current_stock")}>
                      <span className="flex items-center">
                        <span>Stock</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(pageSize)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.ItemId}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isItemSelected(item.ItemId)}
                          onCheckedChange={(checked: boolean) => handleSelectItem(item.ItemId, checked)}
                          aria-label={`Select item ${item.ItemName}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.ItemCode || generateItemCode(item.CategoryName || undefined, item.ItemId)}
                      </TableCell>
                      <TableCell className="font-medium">{item.ItemName}</TableCell>
                      <TableCell>{item.CategoryName || 'N/A'}</TableCell>
                      <TableCell>{item.RackNo || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(item.SellPrice)}</TableCell>
                      <TableCell className="text-center font-bold">
                        {item.current_stock <= 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : item.current_stock <= 5 ? (
                          <Badge variant="secondary">{item.current_stock}</Badge>
                        ) : (
                          item.current_stock
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <EditItemDialog item={{...item, CategoryMaster: { CategoryName: item.CategoryName || '' }}} onItemUpdated={fetchItems} />
                          <DeleteItemAlert item={{...item, CategoryMaster: { CategoryName: item.CategoryName || '' }}} onItemDeleted={fetchItems} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
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
      <AddItemDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onItemAdded={fetchItems}
      />
    </div>
  );
}

export default ItemsPage;