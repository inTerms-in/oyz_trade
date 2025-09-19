"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptVoucherWithSettlements } from "@/types";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/auth-provider";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/data-table-pagination";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ChevronDown, PlusCircle, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type SortDirection = "asc" | "desc";

function ReceiptVouchersPage() {
  const { user } = useAuth();
  const [receiptVouchers, setReceiptVouchers] = useState<ReceiptVoucherWithSettlements[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "ReceiptDate",
    direction: "desc",
  });

  const fetchReceiptVouchers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("receipt_vouchers")
      .select("*, CustomerMaster(CustomerName), receivable_settlements(*)", { count: "exact" });

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
      query = query.gte("ReceiptDate", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("ReceiptDate", toDate.toISOString());
    }

    let sortColumn = sort.column;
    if (sort.column === "CustomerMaster.CustomerName") {
      sortColumn = "CustomerId";
    }

    query = query.order(sortColumn, { ascending: sort.direction === "asc" }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch receipt vouchers", { description: error.message });
      setReceiptVouchers([]);
    } else {
      setReceiptVouchers(data as ReceiptVoucherWithSettlements[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange, user?.id]);

  useEffect(() => {
    fetchReceiptVouchers();
  }, [fetchReceiptVouchers]);
  
  useEffect(() => {
    const channel = supabase.channel('public:receipt_vouchers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipt_vouchers' },
        () => {
          toast.info("Receipt vouchers have been updated. Refreshing list...");
          fetchReceiptVouchers();
        }
      )
      .subscribe();

    const settlementChannel = supabase.channel('public:receivable_settlements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivable_settlements' },
        () => {
          toast.info("Receivable settlements have been updated. Refreshing list...");
          fetchReceiptVouchers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settlementChannel);
    };
  }, [fetchReceiptVouchers]);

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
              <CardTitle>Receipt Vouchers</CardTitle>
              <CardDescription>Manage customer payments and receivable settlements.</CardDescription>
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
                  <Link to="/accounts-module/receipt-vouchers/new">
                    <Button className="w-full">
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New</span>
                      </span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create New Receipt Voucher (Ctrl+N)</p>
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
                    <Button variant="ghost" onClick={() => handleSort("ReceiptDate")}>
                      <span className="flex items-center">
                        <span>Date</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("AmountReceived")}>
                      <span className="flex items-center">
                        <span>Amount Received</span>
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
              ) : receiptVouchers.length > 0 ? (
                receiptVouchers.map((voucher) => (
                  <Collapsible asChild key={voucher.ReceiptVoucherId}>
                    <tbody className="border-b">
                      <TableRow>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Toggle details">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{voucher.ReferenceNo}</TableCell>
                        <TableCell className="font-medium">{voucher.CustomerMaster?.CustomerName || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(voucher.ReceiptDate), "PPP")}</TableCell>
                        <TableCell>{formatCurrency(voucher.AmountReceived)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {/* Edit Receipt Voucher is not yet implemented */}
                            {/* <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/accounts-module/receipt-vouchers/edit/${voucher.ReceiptVoucherId}`}>
                                  <Button variant="ghost" size="icon" aria-label="Edit receipt voucher">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Receipt Voucher (Ctrl+E)</p>
                              </TooltipContent>
                            </Tooltip> */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DeleteReceiptVoucherAlert receiptVoucher={voucher} onReceiptVoucherDeleted={fetchReceiptVouchers} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Receipt Voucher (Ctrl+D)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <div className="p-4 bg-muted/50">
                              <h4 className="font-semibold mb-2">Settlements</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Receivable Ref No.</TableHead>
                                    <TableHead className="text-right">Original Amount</TableHead>
                                    <TableHead className="text-right">Amount Settled</TableHead>
                                    <TableHead className="text-right">Remaining Balance</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {voucher.receivable_settlements.length > 0 ? (
                                    voucher.receivable_settlements.map((settlement: ReceivableSettlement) => (
                                      <TableRow key={settlement.SettlementId}>
                                        <TableCell className="font-mono text-xs">{settlement.Receivables?.ReferenceNo || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(settlement.Receivables?.Amount || 0)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(settlement.AmountSettled)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency((settlement.Receivables?.Amount || 0) - (settlement.Receivables?.Balance || 0) - settlement.AmountSettled)}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={4} className="h-12 text-center text-muted-foreground">
                                        No receivables settled with this voucher.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                              <div className="flex justify-end mt-4">
                                  <div className="w-full max-w-xs space-y-1 text-sm">
                                      <div className="flex justify-between">
                                          <span className="text-muted-foreground">Payment Type</span>
                                          <span>{voucher.PaymentType}</span>
                                      </div>
                                      {voucher.PaymentMode && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Mode</span>
                                            <span>{voucher.PaymentMode}</span>
                                        </div>
                                      )}
                                      {voucher.CashAmount && voucher.CashAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cash Amount</span>
                                            <span>{formatCurrency(voucher.CashAmount)}</span>
                                        </div>
                                      )}
                                      {voucher.BankAmount && voucher.BankAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Bank Amount</span>
                                            <span>{formatCurrency(voucher.BankAmount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                          <span>Total Received</span>
                                          <span>{formatCurrency(voucher.AmountReceived)}</span>
                                      </div>
                                  </div>
                              </div>
                              {voucher.Description && (
                                <div className="mt-4 text-sm text-muted-foreground">
                                  <span className="font-semibold">Description:</span> {voucher.Description}
                                </div>
                              )}
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
                      No receipt vouchers found.
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

export default ReceiptVouchersPage;