"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PaymentVoucherWithSettlements } from "@/types";
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
import { ChevronDown, Pencil, PlusCircle, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeletePaymentVoucherAlert } from "@/components/delete-payment-vouchers-alert";

type SortDirection = "asc" | "desc";

function PaymentVouchersPage() {
  const { user } = useAuth();
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucherWithSettlements[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: "PaymentDate",
    direction: "desc",
  });

  const fetchPaymentVouchers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("payment_vouchers")
      .select("*, SupplierMaster(SupplierName), payable_settlements(*, Payables(ReferenceNo, Amount, Balance))", { count: "exact" });

    if (debouncedSearchTerm) {
      const { data: matchingSuppliers, error: supplierError } = await supabase
        .from("SupplierMaster")
        .select("SupplierId")
        .ilike("SupplierName", `%${debouncedSearchTerm}%`);

      if (supplierError) {
        console.error("Error fetching matching suppliers:", supplierError);
        query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
      } else {
        const supplierIds = matchingSuppliers.map(s => s.SupplierId);
        if (supplierIds.length > 0) {
          query = query.or(`ReferenceNo.ilike.%${debouncedSearchTerm}%,SupplierId.in.(${supplierIds.join(',')})`);
        } else {
          query = query.ilike("ReferenceNo", `%${debouncedSearchTerm}%`);
        }
      }
    }

    if (dateRange?.from) {
      query = query.gte("PaymentDate", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      query = query.lte("PaymentDate", toDate.toISOString());
    }

    let sortColumn = sort.column;
    if (sort.column === "SupplierMaster.SupplierName") {
      sortColumn = "SupplierId";
    }

    query = query.order(sortColumn, { ascending: sort.direction === "asc" }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Failed to fetch payment vouchers", { description: error.message });
      setPaymentVouchers([]);
    } else {
      setPaymentVouchers(data as PaymentVoucherWithSettlements[]);
      setItemCount(count ?? 0);
      setPageCount(Math.ceil((count ?? 0) / pageSize));
    }
    setLoading(false);
  }, [pageIndex, pageSize, debouncedSearchTerm, sort, dateRange, user?.id]);

  useEffect(() => {
    fetchPaymentVouchers();
  }, [fetchPaymentVouchers]);
  
  useEffect(() => {
    const channel = supabase.channel('public:payment_vouchers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_vouchers' },
        () => {
          toast.info("Payment vouchers have been updated. Refreshing list...");
          fetchPaymentVouchers();
        }
      )
      .subscribe();

    const settlementChannel = supabase.channel('public:payable_settlements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payable_settlements' },
        () => {
          toast.info("Payable settlements have been updated. Refreshing list...");
          fetchPaymentVouchers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settlementChannel);
    };
  }, [fetchPaymentVouchers]);

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
              <CardTitle>Payment Vouchers</CardTitle>
              <CardDescription>Manage supplier payments and payable settlements.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search suppliers or Ref No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto"
              />
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/accounts-module/payment-vouchers/new">
                    <Button className="w-full">
                      <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New</span>
                      </span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create New Payment Voucher (Ctrl+N)</p>
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
                    <Button variant="ghost" onClick={() => handleSort("SupplierMaster.SupplierName")}>
                      <span className="flex items-center">
                        <span>Supplier</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("PaymentDate")}>
                      <span className="flex items-center">
                        <span>Date</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("AmountPaid")}>
                      <span className="flex items-center">
                        <span>Amount Paid</span>
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
              ) : paymentVouchers.length > 0 ? (
                paymentVouchers.map((voucher) => (
                  <Collapsible asChild key={voucher.PaymentVoucherId}>
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
                        <TableCell className="font-medium">{voucher.SupplierMaster?.SupplierName || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(voucher.PaymentDate), "PPP")}</TableCell>
                        <TableCell>{formatCurrency(voucher.AmountPaid)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            {/* Edit Payment Voucher is not yet implemented */}
                            {/* <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/accounts-module/payment-vouchers/edit/${voucher.PaymentVoucherId}`}>
                                  <Button variant="ghost" size="icon" aria-label="Edit payment voucher">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Payment Voucher (Ctrl+E)</p>
                              </TooltipContent>
                            </Tooltip> */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DeletePaymentVoucherAlert paymentVoucher={voucher} onPaymentVoucherDeleted={fetchPaymentVouchers} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Payment Voucher (Ctrl+D)</p>
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
                                    <TableHead>Payable Ref No.</TableHead>
                                    <TableHead className="text-right">Original Amount</TableHead>
                                    <TableHead className="text-right">Amount Settled</TableHead>
                                    <TableHead className="text-right">Remaining Balance</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {voucher.payable_settlements.length > 0 ? (
                                    voucher.payable_settlements.map((settlement) => (
                                      <TableRow key={settlement.SettlementId}>
                                        <TableCell className="font-mono text-xs">{settlement.Payables?.ReferenceNo || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(settlement.Payables?.Amount || 0)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(settlement.AmountSettled)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency((settlement.Payables?.Amount || 0) - (settlement.Payables?.Balance || 0) - settlement.AmountSettled)}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={4} className="h-12 text-center text-muted-foreground">
                                        No payables settled with this voucher.
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
                                          <span>Total Paid</span>
                                          <span>{formatCurrency(voucher.AmountPaid)}</span>
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
                      No payment vouchers found.
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

export default PaymentVouchersPage;