"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SalesReturnWithItems } from "@/types";
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
import { ChevronDown, Pencil, PlusCircle, ArrowUpDown } from "lucide-react";
import { DeleteSalesReturnAlert } from "@/components/delete-sales-return-alert";

type SortDirection = "asc" | "desc";

function SalesReturnPage() {
  const [salesReturns, setSalesReturns] = useState<SalesReturnWithItems[]>([]);
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

  const fetchSalesReturns = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("SalesReturn")
      .select("*, SalesReturnItem(*, ItemMaster(ItemName, ItemCode, CategoryMaster(CategoryName))), Sales(ReferenceNo, CustomerMaster(CustomerName))", { count: "exact" });

    if (debouncedSearchTerm) {
      // Search by ReferenceNo of the return or the original sale's ReferenceNo or CustomerName
      const { data: matchingSales, error: salesError } = await supabase
        .from("Sales")
        .select("SaleId, ReferenceNo, CustomerMaster(CustomerName)")
        .or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,CustomerMaster(CustomerName.ilike.%${debouncedSearchTerm}%)`);

      if (salesError) {
        console.error("Error fetching matching sales:", salesError);
        query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
      } else {
        const saleIds = matchingSales.map(s => s.SaleId);
        if (saleIds.length > 0) {
          query = query.or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,SaleId.in.(${saleIds.join(',')})`);
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
      toast.error("Failed to fetch sales returns", { description: error.message });
      setSalesReturns([]);
    } else {
      setSalesReturns(data as SalesReturnWithItems[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange]);

  useEffect(() => {
    fetchSalesReturns();
  }, [fetchSalesReturns]);
  
  useEffect(() => {
    const channel = supabase.channel('public:SalesReturn')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'SalesReturn' },
        () => {
          toast.info("Sales returns have been updated. Refreshing list...");
          fetchSalesReturns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSalesReturns]);

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
              <CardTitle>Sales Returns</CardTitle>
              <CardDescription>Manage your sales return records.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search returns or original sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Link to="/sales-module/sales-return/new">
                <Button className="w-full">
                  <span className="flex items-center">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>New Return</span>
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
                      <span className="flex items-center">
                        <span>Return Ref No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("Sales.ReferenceNo")}>
                      <span className="flex items-center">
                        <span>Original Sale Ref No.</span>
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
              ) : salesReturns.length > 0 ? (
                salesReturns.map((salesReturn) => (
                  <Collapsible asChild key={salesReturn.SalesReturnId}>
                    <tbody className="border-b">
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Toggle details">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{salesReturn.ReferenceNo}</TableCell>
                        <TableCell className="font-mono text-xs">{salesReturn.Sales?.ReferenceNo || 'N/A'}</TableCell>
                        <TableCell>{new Date(salesReturn.ReturnDate).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(salesReturn.TotalRefundAmount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Link to={`/sales-module/sales-return/edit/${salesReturn.SalesReturnId}`}>
                              <Button variant="ghost" size="icon" aria-label="Edit sales return">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <DeleteSalesReturnAlert salesReturn={salesReturn} onSalesReturnDeleted={fetchSalesReturns} />
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
                                  {salesReturn.SalesReturnItem.map((item) => (
                                    <TableRow key={item.SalesReturnItemId}>
                                      <TableCell className="font-mono text-xs">{item.ItemMaster?.ItemCode || 'N/A'}</TableCell>
                                      <TableCell>{item.ItemMaster?.ItemName || 'N/A'}</TableCell>
                                      <TableCell>{item.Qty} {item.Unit}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice)}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice * item.Qty)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {salesReturn.Reason && (
                                <div className="mt-4 text-sm text-muted-foreground">
                                  <span className="font-semibold">Reason:</span> {salesReturn.Reason}
                                </div>
                              )}
                              <div className="flex justify-end mt-4">
                                  <div className="w-full max-w-xs space-y-1 text-sm">
                                      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                          <span>Total Refund</span>
                                          <span>{formatCurrency(salesReturn.TotalRefundAmount)}</span>
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
                      No sales returns found.
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

export default SalesReturnPage;