"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth

interface CustomerReceivable extends Customer {
  total_sales_amount: number;
  total_return_amount: number;
  net_receivable: number;
}

export default function CustomerReceivablesPage() {
  const { user } = useAuth(); // Use useAuth
  const [receivables, setReceivables] = useState<CustomerReceivable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerReceivables = async () => {
      if (!user?.id) { // Still need user for authentication, but not for data filtering
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('CustomerMaster')
        .select(`
          CustomerId,
          CustomerName,
          MobileNo,
          Sales(TotalAmount, SalesReturn(TotalRefundAmount))
        `);

      if (error) {
        toast.error("Failed to fetch customer receivables", { description: error.message });
        setReceivables([]);
        setLoading(false);
        return;
      }

      const customerMap = new Map<number, CustomerReceivable>();

      data.forEach(customer => {
        const existing = customerMap.get(customer.CustomerId) || {
          CustomerId: customer.CustomerId,
          CustomerName: customer.CustomerName,
          MobileNo: customer.MobileNo,
          total_sales_amount: 0,
          total_return_amount: 0,
          net_receivable: 0,
        };

        customer.Sales.forEach((sale: { TotalAmount: number, SalesReturn: { TotalRefundAmount: number }[] }) => {
          existing.total_sales_amount += sale.TotalAmount;
          sale.SalesReturn.forEach(sReturn => {
            existing.total_return_amount += sReturn.TotalRefundAmount;
          });
        });

        existing.net_receivable = existing.total_sales_amount - existing.total_return_amount;
        customerMap.set(customer.CustomerId, existing);
      });

      // Filter out customers with 0 net receivable if desired, or show all
      const sortedReceivables = Array.from(customerMap.values())
        .filter(c => c.net_receivable > 0) // Only show positive receivables
        .sort((a, b) => b.net_receivable - a.net_receivable); // Sort by highest receivable

      setReceivables(sortedReceivables);
      setLoading(false);
    };

    fetchCustomerReceivables();
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Receivables</CardTitle>
          <CardDescription>Overview of outstanding amounts from customers (Total Sales - Total Returns).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : receivables.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Mobile No.</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Total Returns</TableHead>
                    <TableHead className="text-right">Net Receivable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((customer) => (
                    <TableRow key={customer.CustomerId}>
                      <TableCell className="font-medium">{customer.CustomerName}</TableCell>
                      <TableCell>{customer.MobileNo || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.total_sales_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.total_return_amount)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(customer.net_receivable)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No outstanding receivables found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}