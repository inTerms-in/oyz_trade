"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseReturnWithItems } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChevronDown, PlusCircle, ArrowUpDown } from "lucide-react";
import { DeletePurchaseReturnAlert } from "@/components/delete-purchase-return-alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function PurchaseReturnPage() {
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "ReturnDate",
    direction: "desc",
  });

  const fetchPurchaseReturns = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("PurchaseReturn")
      .select("*, PurchaseReturnItem(*, ItemMaster(ItemName, ItemCode, CategoryMaster(CategoryName))), Purchase(ReferenceNo, SupplierMaster(SupplierName))", { count: "exact" });

    if (debouncedSearchTerm) {
      const { data: matchingPurchases, error: purchaseError } = await supabase
        .from("Purchase")
        .select("PurchaseId, ReferenceNo, SupplierMaster(SupplierName)")
        .or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,SupplierMaster(SupplierName.ilike.%${debouncedSearchTerm}%)`);

      if (purchaseError) {
        console.error("Error fetching matching purchases:", purchaseError);
        query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
      } else {
        const purchaseIds = matchingPurchases.map(p => p.PurchaseId);
        if (purchaseIds.length > 0) {
          query = query.or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,PurchaseId.in.(${purchaseIds.join(',')})`);
        } else {
          query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
        }
      }
    }

    if (dateRange?.from) {
      query = query.gte("ReturnDate", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("ReturnDate", toDate.toISOString());
    }

    query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch purchase returns", { description: error.message });
      setPurchaseReturns([]);
    } else {
      setPurchaseReturns(data as PurchaseReturnWithItems[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange]);

  useEffect(() => {
    fetchPurchaseReturns();
  }, [fetchPurchaseReturns]);
  
  useEffect(() => {
    const channel = supabase.channel('public:PurchaseReturn')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'PurchaseReturn' },
        () => {
          toast.info("Purchase returns have been updated. Refreshing list...");
          fetchPurchaseReturns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPurchaseReturns]);

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
              <CardTitle>Purchase Returns</CardTitle>
              <CardDescription>Manage your purchase return records.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search returns or original purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/purchase-module/purchase-return/new">
                    <Button className="w-full">
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New Return</span>
                      </span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Record New Purchase Return (Ctrl+N)</p>
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
                  <TableHead className="w-12"></TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ReferenceNo")}>
                      <span className="flex items-center">
                        <span>Return Ref No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("Purchase.ReferenceNo")}>
                      <span className="flex items-center">
                        <span>Original Purchase Ref No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("ReturnDate")}>
                      <span className="flex items-center">
                        <span>Return Date</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("TotalRefundAmount")}>
                      <span className="flex items-center">
                        <span>Refund Amount</span>
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
              ) : purchaseReturns.length > 0 ? (
                purchaseReturns.map((purchaseReturn) => (
                  <Collapsible asChild key={purchaseReturn.PurchaseReturnId}>
                    <tbody className="border-b">
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Toggle details">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{purchaseReturn.ReferenceNo}</TableCell>
                        <TableCell className="font-mono text-xs">{purchaseReturn.Purchase?.ReferenceNo || 'N/A'}</TableCell>
                        <TableCell>{new Date(purchaseReturn.ReturnDate).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(purchaseReturn.TotalRefundAmount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {/* Edit Purchase Return is not yet implemented, so no tooltip for it */}
                            {/* <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/purchase-module/purchase-return/edit/${purchaseReturn.PurchaseReturnId}`}>
                                  <Button variant="ghost" size="icon" aria-label="Edit purchase return">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Purchase Return (Ctrl+E)</p>
                              </TooltipContent>
                            </Tooltip> */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DeletePurchaseReturnAlert purchaseReturn={purchaseReturn} onPurchaseReturnDeleted={fetchPurchaseReturns} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Purchase Return (Ctrl+D)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <div className="p-4 bg-muted/50">
                              <h4 className="font-semibold mb-2">Returned Items</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item Code</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {purchaseReturn.PurchaseReturnItem.map((item) => (
                                    <TableRow key={item.PurchaseReturnItemId}>
                                      <TableCell className="font-mono text-xs">{item.ItemMaster?.ItemCode || 'N/A'}</TableCell>
                                      <TableCell>{item.ItemMaster?.ItemName || 'N/A'}</TableCell>
                                      <TableCell>{item.Qty} {item.Unit}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice)}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice * item.Qty)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {purchaseReturn.Reason && (
                                <div className="mt-4 text-sm text-muted-foreground">
                                  <span className="font-semibold">Reason:</span> {purchaseReturn.Reason}
                                </div>
                              )}
                              <div className="flex justify-end mt-4">
                                  <div className="w-full max-w-xs space-y-1 text-sm">
                                      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                          <span>Total Refund</span>
                                          <span>{formatCurrency(purchaseReturn.TotalRefundAmount)}</span>
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
                      No purchase returns found.
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

export default PurchaseReturnPage;