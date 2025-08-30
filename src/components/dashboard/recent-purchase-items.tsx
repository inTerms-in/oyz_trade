import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-provider"; // Import useAuth

interface RecentItem {
  ItemName: string;
  ShopName: string;
  PurchaseDate: string;
  UnitPrice: number;
}

export function RecentPurchaseItems() {
  const { user } = useAuth(); // Use useAuth
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentItems = async () => {
      if (!user?.id) return; // Ensure user is logged in
      setLoading(true);
      const { data, error } = await supabase
        .from("PurchaseItem")
        .select(`
          UnitPrice,
          ItemMaster (ItemName),
          Purchase (SupplierMaster(SupplierName), PurchaseDate)
        `)
        .eq("user_id", user.id) // Filter by user_id
        .order("PurchaseId", { ascending: false })
        .limit(10);

      if (error) {
        toast.error("Failed to fetch recent items", { description: error.message });
      } else {
        const formattedData = data.map((item: any) => ({
          ItemName: item.ItemMaster.ItemName,
          ShopName: item.Purchase.SupplierMaster?.SupplierName || 'N/A',
          PurchaseDate: item.Purchase.PurchaseDate,
          UnitPrice: item.UnitPrice,
        }));
        setItems(formattedData);
      }
      setLoading(false);
    };

    fetchRecentItems();
  }, [user?.id]); // Add user.id to dependencies

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "INR" }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Items Purchased</CardTitle>
        <CardDescription>The last 10 items you bought.</CardDescription>
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
                <TableHead>Shop</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.ItemName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.ShopName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.UnitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No items purchased yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}