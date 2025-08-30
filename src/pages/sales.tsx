import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom"; // Import useLocation
import { supabase } from "@/integrations/supabase/client";
import { SaleWithItems } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteSaleAlert } from "@/components/delete-sale-alert";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChevronDown, Pencil, PlusCircle, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function SalesPage() {
  const location = useLocation(); // Use useLocation to check for state
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "SaleDate",
    direction: "desc",
  });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("Sales")
      .select("*, SalesItem(*, ItemMaster(*, CategoryMaster(*))), CustomerMaster(CustomerName)", { count: "exact" });

    if (debouncedSearchTerm) {
      const { data: matchingCustomers, error: customerError } = await supabase
        .from("CustomerMaster")
        .select("CustomerId")
        .ilike("CustomerName", `%${debouncedSearchTerm}%`);

      if (customerError) {
        console.error("Error fetching matching customers:", customerError);
        query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
      } else {
        const customerIds = matchingCustomers.map(c => c.CustomerId);
        if (customerIds.length > 0) {
          query = query.or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,CustomerId.in.(${customerIds.join(',')})`);
        } else {
          query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
        }
      }
    }

    if (dateRange?.from) {
      query = query.gte("SaleDate", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("SaleDate", toDate.toISOString());
    }

    let sortColumn = sort.column;
    if (sort.column === "CustomerMaster.CustomerName") {
      sortColumn = "CustomerId";
    }

    query = query.order(sortColumn, { ascending: sort.direction === "asc" }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch sales", { description: error.message });
      setSales([]);
    } else {
      setSales(data as SaleWithItems[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);
  
  useEffect(() => {
    const channel = supabase.channel('public:Sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Sales' },
        () => {
          toast.info("Sales have been updated. Refreshing list...");
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSales]);

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
              <CardTitle>Sales</CardTitle>
              <CardDescription>Manage your sales records.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search customers or Ref No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/sales-module/sales-invoice/new">
                    <Button className="w-full">
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New Sale</span>
                      </span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add New Sale (Ctrl+N)</p>
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
                        <span>Ref No.</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("CustomerMaster.CustomerName")}>
                      <span className="flex items-center">
                        <span>Customer</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("SaleDate")}>
                      <span className="flex items-center">
                        <span>Date</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("TotalAmount")}>
                      <span className="flex items-center">
                        <span>Total Amount</span>
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
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <Collapsible asChild key={sale.SaleId}>
                    <tbody className="border-b">
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Toggle details">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{sale.ReferenceNo}</TableCell>
                        <TableCell className="font-medium">{sale.CustomerMaster?.CustomerName || 'N/A'}</TableCell>
                        <TableCell>{new Date(sale.SaleDate).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(sale.TotalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/sales-module/sales-invoice/edit/${sale.SaleId}`}>
                                  <Button variant="ghost" size="icon" aria-label="Edit sale">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Sale (Ctrl+E)</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DeleteSaleAlert sale={sale} onSaleDeleted={fetchSales} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Sale (Ctrl+D)</p>
                              </TooltipContent>
                            </Tooltip>
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
                                    <TableHead>Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sale.SalesItem.map((item) => (
                                    <TableRow key={item.SalesItemId}>
                                      <TableCell>{item.ItemMaster?.ItemName || 'N/A'}</TableCell>
                                      <TableCell>{item.Qty} {item.Unit}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice)}</TableCell>
                                      <TableCell>{formatCurrency(item.UnitPrice * item.Qty)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="flex justify-end mt-4">
                                  <div className="w-full max-w-xs space-y-1 text-sm">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Subtotal</span>
                                          <span>{formatCurrency(sale.TotalAmount + (sale.AdditionalDiscount || 0))}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Discount</span>
                                          <span>- {formatCurrency(sale.AdditionalDiscount || 0)}</span>
                                      </div>
                                      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                          <span>Total</span>
                                          <span>{formatCurrency(sale.TotalAmount)}</span>
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

export default SalesPage;