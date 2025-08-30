import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemWithStock } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SortDirection = "asc" | "desc";

function InventoryPage() {
  const { user } = useAuth(); // Use useAuth
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: keyof ItemWithStock; direction: SortDirection }>({
    column: "ItemName",
    direction: "asc",
  });

  const fetchInventory = useCallback(async () => {
    if (!user?.id) return; // Ensure user is logged in
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("item_stock_details")
      .select("*", { count: "exact" })
      .eq("user_id", user.id); // Filter by user_id

    if (debouncedSearchTerm) {
      query = query.ilike("ItemName", `%${debouncedSearchTerm}%`);
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" });
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch inventory", { description: error.message });
      setItems([]);
    } else {
      setItems(data as ItemWithStock[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, user?.id]); // Add user.id to dependencies

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSort = (column: keyof ItemWithStock) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>View current stock levels for all items.</CardDescription>
            </div>
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-[250px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ItemName")}>
                      Item Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CategoryName")}>
                      Category
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort("total_purchased")}>
                      Purchased
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort("total_sold")}>
                      Sold
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" onClick={() => handleSort("current_stock")}>
                      Current Stock
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(pageSize)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.ItemId}>
                      <TableCell className="font-medium">{item.ItemName}</TableCell>
                      <TableCell>{item.CategoryName || 'N/A'}</TableCell>
                      <TableCell className="text-center">{item.total_purchased}</TableCell>
                      <TableCell className="text-center">{item.total_sold}</TableCell>
                      <TableCell className="text-center font-bold">
                        {item.current_stock <= 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : item.current_stock <= 5 ? (
                          <Badge variant="secondary">{item.current_stock}</Badge>
                        ) : (
                          item.current_stock
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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

export default InventoryPage;