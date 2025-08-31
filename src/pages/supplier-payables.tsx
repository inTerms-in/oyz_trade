"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Supplier } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth

interface SupplierPayable extends Supplier {
  total_purchase_amount: number;
  total_return_amount: number;
  net_payable: number;
}

export default function SupplierPayablesPage() {
  const { user } = useAuth(); // Use useAuth
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplierPayables = async () => {
      if (!user?.id) { // Still need user for authentication, but not for data filtering
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('SupplierMaster')
        .select(`
          SupplierId,
          SupplierName,
          MobileNo,
          Purchase(TotalAmount),
          PurchaseReturn(TotalRefundAmount)
        `);

      if (error) {
        toast.error("Failed to fetch supplier payables", { description: error.message });
        setPayables([]);
        setLoading(false);
        return;
      }

      const supplierMap = new Map<number, SupplierPayable>();

      data.forEach(supplier => {
        const existing = supplierMap.get(supplier.SupplierId) || {
          SupplierId: supplier.SupplierId,
          SupplierName: supplier.SupplierName,
          MobileNo: supplier.MobileNo,
          total_purchase_amount: 0,
          total_return_amount: 0,
          net_payable: 0,
        };

        supplier.Purchase.forEach((purchase: { TotalAmount: number }) => {
          existing.total_purchase_amount += purchase.TotalAmount;
        });

        supplier.PurchaseReturn.forEach((pReturn: { TotalRefundAmount: number }) => {
          existing.total_return_amount += pReturn.TotalRefundAmount;
        });

        existing.net_payable = existing.total_purchase_amount - existing.total_return_amount;
        supplierMap.set(supplier.SupplierId, existing);
      });

      // Filter out suppliers with 0 net payable if desired, or show all
      const sortedPayables = Array.from(supplierMap.values())
        .filter(s => s.net_payable > 0) // Only show positive payables
        .sort((a, b) => b.net_payable - a.net_payable); // Sort by highest payable

      setPayables(sortedPayables);
      setLoading(false);
    };

    fetchSupplierPayables();
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <div className="flex-1 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Payables</CardTitle>
          <CardDescription>Overview of outstanding amounts to suppliers (Total Purchases - Total Returns).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : payables.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Mobile No.</TableHead>
                    <TableHead className="text-right">Total Purchases</TableHead>
                    <TableHead className="text-right">Total Returns</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((supplier) => (
                    <TableRow key={supplier.SupplierId}>
                      <TableCell className="font-medium">{supplier.SupplierName}</TableCell>
                      <TableCell>{supplier.MobileNo || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(supplier.total_purchase_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(supplier.total_return_amount)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(supplier.net_payable)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No outstanding payables found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SupplierPayablesPage;