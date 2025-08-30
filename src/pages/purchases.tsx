import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseWithItems } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletePurchaseAlert } from "@/components/delete-purchase-alert";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChevronDown, Pencil, PlusCircle, ArrowUpDown } from "lucide-react";

type SortDirection = "asc" | "desc";

function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "PurchaseDate",
    direction: "desc",
  });

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("Purchase")
      .select("*, PurchaseItem(*, ItemMaster(*, CategoryMaster(*))), SupplierMaster(SupplierName)", { count: "exact" });

    if (debouncedSearchTerm) {
      // Search for suppliers matching the search term
      const { data: matchingSuppliers, error: supplierError } = await supabase
        .from("SupplierMaster")
        .select("SupplierId")
        .ilike("SupplierName", `%${debouncedSearchTerm}%`);

      if (supplierError) {
        console.error("Error fetching matching suppliers:", supplierError);
        // Fallback: if supplier search fails, only search by ReferenceNo
        query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
      } else {
        const supplierIds = matchingSuppliers.map(s => s.SupplierId);
        // Construct the OR clause: search ReferenceNo OR SupplierId is in the list of matching supplier IDs
        if (supplierIds.length > 0) {
          query = query.or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,SupplierId.in.(${supplierIds.join(',')})`);
        } else {
          // If no suppliers match, only search by ReferenceNo
          query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
        }
      }
    }

    if (dateRange?.from) {
      query = query.gte("PurchaseDate", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("PurchaseDate", toDate.toISOString());
    }

    // Adjust sorting for SupplierMaster.SupplierName
    let sortColumn = sort.column;
    if (sort.column === "SupplierMaster.SupplierName") {
      sortColumn = "SupplierId"; // Sort by the foreign key directly
    }

    query = query.order(sortColumn, { ascending: sort.direction === "asc" }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch purchases", { description: error.message });
      setPurchases([]);
    } else {
      setPurchases(data as PurchaseWithItems[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);
  
  useEffect(() => {
    const channel = supabase.channel('public:Purchase')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Purchase' },
        () => {
          toast.info("Purchases have been updated. Refreshing list...");
          fetchPurchases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPurchases]);

  const handleSort = (column: string) => {
    const isAsc = sort.column === column && sort.direction === "asc";
    setSort({ column, direction: isAsc ? "desc" : "asc" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Purchases</CardTitle>
              <CardDescription>Manage your purchase records.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search suppliers or Ref No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Link to="/purchases/new">
                <Button className="w-full">
                  <span className="flex items-center"> {/* Single child for Button */}
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>New</span> {/* Wrap text in span */}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ReferenceNo")}>
                      <span className="flex items-center"> {/* Single child for Button */}
                        <span>Ref No.</span> {/* Wrap text in span */}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("SupplierMaster.SupplierName")}>
                      <span className="flex items-center"> {/* Single child for Button */}
                        <span>Supplier</span> {/* Wrap text in span */}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("PurchaseDate")}>
                      <span className="flex items-center"> {/* Single child for Button */}
                        <span>Date</span> {/* Wrap text in span */}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("TotalAmount")}>
                      <span className="flex items-center"> {/* Single child for Button */}
                        <span>Total Amount</span> {/* Wrap text in span */}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableBody>
                  {[...Array(pageSize)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : purchases.length > 0 ? (
                purchases.map((purchase) => (
                  <Collapsible asChild key={purchase.PurchaseId}>
                    <tbody className="border-b">
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Toggle details">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{purchase.ReferenceNo}</TableCell>
                        <TableCell className="font-medium">{purchase.SupplierMaster?.SupplierName || 'N/A'}</TableCell>
                        <TableCell>{new Date(purchase.PurchaseDate).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(purchase.TotalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Link to={`/purchases/edit/${purchase.PurchaseId}`}>
                              <Button variant="ghost" size="icon" aria-label="Edit purchase">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <DeletePurchaseAlert purchase={purchase} onPurchaseDeleted={fetchPurchases} />
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <div className="p-4 bg-muted/50">
                              <h4 className="font-semibold mb-2">Items</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Effective Unit Price</TableHead>
                                    <TableHead>Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(() => {
                                    const subtotal = purchase.TotalAmount - (purchase.AdditionalCost || 0);
                                    return purchase.PurchaseItem.map((item) => {
                                      const itemTotal = item.UnitPrice * item.Qty;
                                      let effectiveTotal = itemTotal;
                                      if (subtotal > 0 && purchase.AdditionalCost) {
                                        const itemProportion = itemTotal / subtotal;
                                        const itemAdditionalCost = purchase.AdditionalCost * itemProportion;
                                        effectiveTotal = itemTotal + itemAdditionalCost;
                                      }
                                      const effectiveUnitPrice = item.Qty > 0 ? effectiveTotal / item.Qty : 0;

                                      return (
                                        <TableRow key={item.PurchaseItemId}>
                                          <TableCell>{item.ItemMaster?.ItemName || 'N/A'}</TableCell>
                                          <TableCell>{item.Qty} {item.Unit}</TableCell>
                                          <TableCell>{formatCurrency(item.UnitPrice)}</TableCell>
                                          <TableCell>{formatCurrency(effectiveUnitPrice)}</TableCell>
                                          <TableCell>{formatCurrency(itemTotal)}</TableCell>
                                        </TableRow>
                                      );
                                    });
                                  })()}
                                </TableBody>
                              </Table>
                              <div className="flex justify-end mt-4">
                                  <div className="w-full max-w-xs space-y-1 text-sm">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Subtotal</span>
                                          <span>{formatCurrency(purchase.TotalAmount - (purchase.AdditionalCost || 0))}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Additional Cost</span>
                                          <span>{formatCurrency(purchase.AdditionalCost || 0)}</span>
                                      </div>
                                      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                          <span>Total</span>
                                          <span>{formatCurrency(purchase.TotalAmount)}</span>
                                      </div>
                                  </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </tbody>
                  </Collapsible>
                ))
              ) : (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
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

export default PurchasesPage;