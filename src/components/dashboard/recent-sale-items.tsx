import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
// Removed useAuth import as user_id is no longer used for filtering

interface RecentItem {
  ItemName: string;
  CustomerName: string;
  SaleDate: string;
  UnitPrice: number;
}

export function RecentSaleItems() {
  // Removed user from useAuth
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("SalesItem")
        .select(`
          UnitPrice,
          ItemMaster (ItemName),
          Sales (CustomerMaster(CustomerName), SaleDate)
        `)
        // Removed .eq("user_id", user.id) filter
        .order("SaleId", { ascending: false })
        .limit(10);

      if (error) {
        toast.error("Failed to fetch recent sold items", { description: error.message });
      } else {
        const formattedData = data.map((item: any) => ({
          ItemName: item.ItemMaster.ItemName,
          CustomerName: item.Sales.CustomerMaster?.CustomerName || 'Walk-in Customer',
          SaleDate: item.Sales.SaleDate,
          UnitPrice: item.UnitPrice,
        }));
        setItems(formattedData);
      }
      setLoading(false);
    };

    fetchRecentItems();
  }, []); // Removed user.id from dependencies

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Items Sold</CardTitle>
        <CardDescription>The last 10 items you sold.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.ItemName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.CustomerName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.UnitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No items sold yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}